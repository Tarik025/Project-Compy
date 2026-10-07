import { Apiresponse } from "../utilis/api-response.js"
import { asyncHandler } from "../utilis/async-handler.js";

/* Instead of this we make a "async Handler" in utilis which we can use anywhere

const healthCheck = async (req, res, next) => {
    try {
        const user = await getUserFromDB();
        res.status(200).json(
            new Apiresponse(200, { message: "Server is running" })
        )
    } catch (error) {
        next(err)
    }
}
*/

const healthCheck = asyncHandler(async (req, res) => {
    res.status(200).json(
        new Apiresponse(200, { message: "Server is running" })
    )
})

export { healthCheck };