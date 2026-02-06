import express from "express";

const app = express();

// Patreon sends raw JSON
app.use("/webhooks/patreon", express.raw({ type: "application/json" }));

app.post("/webhooks/patreon", (req, res) => {
  console.log("PATREON WEBHOOK HIT");
  console.log(req.body.toString());
  res.sendStatus(200);
});

app.get("/health", (req, res) => res.status(200).send("ok"));

app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log("Listening on", process.env.PORT || 3000);
});
