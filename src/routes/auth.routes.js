import { Router } from "express"
import { login, registerUser, logoutUser, verifyEmail, forgotPasswordRequest, getCurrentUser, resendEmailVerificationToken, resetForgotPassword, changeCurrentPassword } from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validator.middleware.js";
import { userRegistrationValidator, userLoginValidator, userForgotPasswordValidator, userChangeCurrentPasswordValidator } from "../validators/index.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";



const router = Router();

//unsecure routes
router.route("/register").post(userRegistrationValidator(), validate, registerUser);

router.route("/login").post(userLoginValidator(), validate, login);

router.route("/verify-email/:vericationToken").get(verifyEmail); //check notion

router.route("/refresh-token").post(refreshAccessToken);

router.route("/forgot-password").post(userForgotPasswordValidator(), validate, forgotPasswordRequest);

router.route("/forgot-password").post(userForgotPasswordValidator(), validate, forgotPasswordRequest);

router.route("/reset-password/:resetToken").post(userResetForgotPasswordValidator(), validate, resetForgotPassword);


//secure routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/current-user").post(verifyJWT, getCurrentUser);
router.route("/change-password").post(verifyJWT, userChangeCurrentPasswordValidator(), validate, changeCurrentPassword);
router.route("/resend-email-varification").post(verifyJWT, resendEmailVerificationToken);

export default router