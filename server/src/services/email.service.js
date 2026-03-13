const nodemailer = require("nodemailer")

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
}

function formatCLP(n) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n)
}

function getGoogleCalUrl({ booking, service, business }) {
  const date = booking.booking_date.replace(/-/g, "")
  const start = booking.start_time.replace(/:/g, "").slice(0, 4) + "00"
  const end = booking.end_time.replace(/:/g, "").slice(0, 4) + "00"
  const url = new URL("https://calendar.google.com/calendar/render")
  url.searchParams.set("action", "TEMPLATE")
  url.searchParams.set("text", `${service.name} - ${business.name}`)
  url.searchParams.set("dates", `${date}T${start}/${date}T${end}`)
  url.searchParams.set("details", `Servicio: ${service.name}`)
  if (business.address) url.searchParams.set("location", business.address)
  return url.toString()
}

// ─── Email al ADMIN cuando llega una reserva ────────────────────────────────
async function sendBookingNotificationToAdmin({ booking, service, business }) {
  const dateFormatted = formatDate(booking.booking_date)
  const price = formatCLP(service.price)

  await transporter.sendMail({
    from: `"BookBarber" <${process.env.EMAIL_USER}>`,
    to: business.email,
    subject: `Nueva reserva — ${booking.client_name} · ${service.name}`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
    <div style="background:linear-gradient(135deg,#1f2937,#374151);padding:32px;text-align:center">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:#f59e0b;border-radius:12px;margin-bottom:12px">
        <span style="color:#fff;font-size:22px">✂️</span>
      </div>
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Nueva reserva recibida</h1>
      <p style="margin:6px 0 0;color:#9ca3af;font-size:14px">${business.name}</p>
    </div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 20px;color:#374151;font-size:15px">Hola, tienes una nueva reserva:</p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:20px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;width:110px">Cliente</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600">${booking.client_name}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px">Email</td>
            <td style="padding:6px 0;color:#111827;font-size:13px">${booking.client_email}</td>
          </tr>
          ${booking.client_phone ? `
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px">Teléfono</td>
            <td style="padding:6px 0;color:#111827;font-size:13px">${booking.client_phone}</td>
          </tr>` : ""}
          <tr><td colspan="2" style="padding:8px 0"><hr style="border:none;border-top:1px solid #fde68a;margin:0"></td></tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px">Servicio</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600">${service.name}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px">Fecha</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;text-transform:capitalize">${dateFormatted}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px">Horario</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600">${booking.start_time.slice(0,5)} - ${booking.end_time.slice(0,5)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px">Precio</td>
            <td style="padding:6px 0;color:#16a34a;font-size:15px;font-weight:700">${price}</td>
          </tr>
          ${booking.notes ? `
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;vertical-align:top">Notas</td>
            <td style="padding:6px 0;color:#374151;font-size:13px">${booking.notes}</td>
          </tr>` : ""}
        </table>
      </div>
      <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center">BookBarber · Sistema de reservas</p>
    </div>
  </div>
</body>
</html>`
  })
}

// ─── Email al CLIENTE confirmando su reserva ────────────────────────────────
async function sendBookingConfirmationToClient({ booking, service, business }) {
  const dateFormatted = formatDate(booking.booking_date)
  const price = formatCLP(service.price)
  const googleCalUrl = getGoogleCalUrl({ booking, service, business })
  const cancelUrl = `${process.env.CLIENT_URL}/b/${business.slug}/cancelar/${booking.confirmation_token}`

  await transporter.sendMail({
    from: `"BookBarber" <${process.env.EMAIL_USER}>`,
    to: booking.client_email,
    subject: `Reserva confirmada en ${business.name} — ${service.name}`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
    <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px;text-align:center">
      <div style="font-size:40px;margin-bottom:8px">✅</div>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">¡Reserva confirmada!</h1>
      <p style="margin:6px 0 0;color:#fef3c7;font-size:14px">${business.name}</p>
    </div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 6px;color:#374151;font-size:15px">Hola <strong>${booking.client_name}</strong>,</p>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px">Tu reserva está confirmada. Aquí están los detalles:</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:7px 0;color:#6b7280;font-size:13px;width:100px">Servicio</td>
            <td style="padding:7px 0;color:#111827;font-size:13px;font-weight:600">${service.name}</td>
          </tr>
          <tr>
            <td style="padding:7px 0;color:#6b7280;font-size:13px">Fecha</td>
            <td style="padding:7px 0;color:#111827;font-size:13px;font-weight:600;text-transform:capitalize">${dateFormatted}</td>
          </tr>
          <tr>
            <td style="padding:7px 0;color:#6b7280;font-size:13px">Horario</td>
            <td style="padding:7px 0;color:#111827;font-size:13px;font-weight:600">${booking.start_time.slice(0,5)} - ${booking.end_time.slice(0,5)}</td>
          </tr>
          ${business.address ? `
          <tr>
            <td style="padding:7px 0;color:#6b7280;font-size:13px">Dirección</td>
            <td style="padding:7px 0;color:#111827;font-size:13px">${business.address}</td>
          </tr>` : ""}
          <tr>
            <td style="padding:7px 0;color:#6b7280;font-size:13px">Precio</td>
            <td style="padding:7px 0;color:#16a34a;font-size:15px;font-weight:700">${price}</td>
          </tr>
        </table>
      </div>
      <div style="text-align:center;margin-bottom:16px">
        <a href="${googleCalUrl}" target="_blank"
          style="display:inline-flex;align-items:center;gap:8px;background:#4285f4;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600">
          📅 Agregar a Google Calendar
        </a>
      </div>
      <p style="text-align:center;margin:0 0 24px">
        <a href="${cancelUrl}" style="color:#9ca3af;font-size:12px;text-decoration:underline">Cancelar reserva</a>
      </p>
      <hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 16px">
      <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center">BookBarber · Sistema de reservas</p>
    </div>
  </div>
</body>
</html>`
  })
}

module.exports = { sendBookingNotificationToAdmin, sendBookingConfirmationToClient }