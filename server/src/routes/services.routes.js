const express = require("express")
const router = express.Router()
router.get("/", (_req, res) => res.json({ message: "services routes OK" }))
module.exports = router
