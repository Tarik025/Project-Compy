import { User } from "../models/user.model.js";
import { Apiresponse } from "../utilis/api-response.js"
import { asyncHandler } from "../utilis/async-handler.js"
import { ApiError } from "../utilis/api-error.js";
import { emailVerificationMailgenContent, forgotPasswordMailgenContent, sendEmail } from "../utilis/mail.js"
import jwt from "jsonwebtoken";
import { urlencoded } from "express";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something wrong while generating Tokens")
    }
}


const registerUser = asyncHandler(async (req, res) => {

    const { email, username, password, role } = req.body//now we are expecting that data will come from body

    //we are talking we DB so dont forget to write 'await'
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User email or username already exists", [])
    }

    const user = await User.create({
        email,
        password,
        username,
        isEmailVerified: false
    })

    const { unhashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = tokenExpiry;

    await user.save({ validateBeforeSave: false })

    await sendEmail(
        {
            email: user?.email,
            subject: "Please verify your email",
            mailgenContent: emailVerificationMailgenContent(user.username,
                `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unhashedToken}`
            )
        }
    )

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationExpiry", //expect it everything is selected
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering a user")
    }

    return res
        .status(201)
        .json(
            new Apiresponse(
                200,
                { user: createdUser },
                "User registered successfully and verification email has been sent on your email",

            )
        );
});


const login = asyncHandler(async (req, res) => {
    console.log("1. Login controller started");

    const { email, password } = req.body;

    console.log("2. Body received:", email);


    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    const user = await User.findOne({ email })

    console.log("3. User found:", !!user);

    if (!user) {
        throw new ApiError(400, "User does not exist")
    }

    //check password
    const isPasswordCorrectValid = await user.isPasswordCorrect(password);

    console.log("5. Password result:", isPasswordCorrectValid);

    if (!isPasswordCorrectValid) {
        throw new ApiError(400, "Invalid credentials")
    }

    console.log("6. Generating tokens");


    //generating tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    console.log("7. Tokens generated");

    //sending data
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationExpiry", //expect it everything is selected
    )

    console.log("8. User fetched");

    const options = {
        httpOnly: true, //Don't let browser JavaScript directly read this cookie.
        secure: true //Only send this cookie over HTTPS.
    }

    console.log("9. Sending response");

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new Apiresponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "User logged In successfully"
            )
        )
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id, //find
        {
            $set: { //update
                refreshToken: ""
            }
        },
        {
            new: true, //means give me most new most updated object
        }
    );
    const options = {
        httpOnly: true, //Don't let browser JavaScript directly read this cookie.
        secure: true //Only send this cookie over HTTPS.
    }

    return res
        .status(200)
        .clearCookie("accessToken", options) //Clear this cookie using the specified cookie configuration/`scope
        .clearCookie("refreshToken", options) //Clear this cookie using the specified cookie configuration/scope
        .json(new Apiresponse(200, {}, "User logged out"))
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new Apiresponse(200, req.user, "Current user fetched successfully"));
})

const verifyEmail = asyncHandler(async (req, res) => {
    const { vericationToken } = req.params;

    if (!vericationToken) {
        throw new ApiError(400, "Email Verification token is missing");
    }

    const hashedToken = crypto
        .createHash("sha256")
        .update(vericationToken)
        .digest("hex")

    await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpiry: { $gt: Date.now() } //
    })

    if (!User) {
        throw new ApiError(400, "Token is invalid or expired")
    }

    //after verification we erase unnecessary data
    User.emailVerificationToken = undefined;
    User.emailVerificationExpiry = undefined;

    User.isEmailVerified = true;
    await User.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(
            new Apiresponse(
                200,
                {
                    isEmailVerified: true
                },
                "Email is verified",
            )
        )
})


const resendEmailVerificationToken = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?._id);

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    if (user.isEmailVerified) {
        throw new ApiError(409, "Email is already verified")
    }

    //we follow same procedure again
    const { unhashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = tokenExpiry;

    await user.save({ validateBeforeSave: false })

    await sendEmail(
        {
            email: user?.email,
            subject: "Please verify your email",
            mailgenContent: emailVerificationMailgenContent(user.username,
                `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unhashedToken}`
            )
        }
    )

    return res
        .status(200)
        .json(new Apiresponse(200, [], "Mail has been sent to your Email ID"))
})



const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        new ApiError(401, "Unauthorized Access")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken);

        if (!user) {
            throw ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

        //update new token in database
        user.refreshToken = newRefreshToken;
        await user.save()

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new Apiresponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access Token Refreshed"
                )
            )

    } catch (error) {
        throw new ApiError(401, "Invalid refresh token")
    }

})


const forgotPasswordRequest = asyncHandler(async (req, res) => {
    const { email } = req.body

    const user = User.findOne({ email })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const { unhashedToken, hashedToken, tokenExpiry } = user.generateAccessAndRefreshTokens();

    //now email token and expiry
    user.forgotPasswordToken = hashedToken;
    user.forgotPasswordExpiry = tokenExpiry;

    await user.save({ validateBeforeSave: false })

    //sending Email, copy from register user
    await sendEmail(
        {
            email: user?.email,
            subject: "Password Reset Request",
            mailgenContent: forgotPasswordMailgenContent(user.username,
                `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unhashedToken}`,
            )
        }
    )

    return res
        .status(200)
        .json(
            new Apiresponse(
                200,
                {},
                "Password reset mail has been sent on your email ID"
            )
        )
})

const resetForgotPassword = asyncHandler(async (req, res) => {
    const { resetToken } = req.params;
    const { newPassword } = req.body;

    let hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    const user = await User.findOne({
        forgotPasswordToken: hashedToken,
        forgotPasswordExpiry: { $gt: Date.now() }
    })

    if (!user) {
        throw new ApiError(489, "Token is invalid or expired")
    }

    user.forgotPasswordToken = undefined;
    user.forgotPasswordExpiry = undefined;

    //we dont worry about hashed password because in models we already define a hook which hashed it
    user.password = newPassword;

    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new Apiresponse(200, {}, "Password reset successfully"));
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);

    const isPasswordValid = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordValid) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword;

    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new Apiresponse(200, {}, "Password changed successfully"));

})

export { 
    registerUser, 
    login, 
    logoutUser, 
    getCurrentUser, 
    verifyEmail, 
    resendEmailVerificationToken, 
    forgotPasswordRequest, 
    resetForgotPassword, 
    changeCurrentPassword 
}
