// /pages/api/ping.js
export default function handler(req, res) {
  console.log("Ping API hit:", req.method);
  res.status(200).json({ message: "pong", method: req.method });
}
