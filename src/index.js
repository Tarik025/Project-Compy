import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./db/db-connection.js";

dotenv.config({
    path: "./.env",
})

const port = process.env.PORT || 3000;

// app.listen(port, () => {
//     console.log(`Example app listening on port ${port}`);
// });


connectDB()
    .then(() => {
        app.listen(port, () => {
            console.log(`Example app listening on port http://localhost: ${port}`);
        });
    })
    .catch((err) => {
        console.error("MongoDB connection error", err);
        process.exit(1);
    })