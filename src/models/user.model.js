import moogonse from "mongoose"
import { Schema } from "mongoose"
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"
import crytpo from "crypto"; 

const userSchema = new Schema(
    {
        avatar: {
            type: {
                url: String,
                localPath: String,
            },
            default: {
                url: `https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTqid0QYWb1atJgpCjbfeRIhdbXmU6ESlub8LtJfoHPhegDE_aPTJDcLO8z&s=10`,
                localPath: "",
            }
        },
        username: {
            type: String,
            required: true, //means it is mandatory
            unique: true, //means should be unique and does not already exist in DB
            lowercase: true,
            trim: true,
            index: true //???
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        fullName: {
            type: String,
            trim: true
        },
        password: {
            type: String,
            required: [true, "Password is required"] //this is custom error pass to the user
        },
        isEmailVerified: {
            type: Boolean,
            default: false
        },
        refreshToken: {
            type: String
        },
        forgotPasswordToken: {
            type: String
        },
        forgotPasswordExpiry: {
            type: Date
        },
        emailVerificationToken: {
            type: String
        },
        emailVerificationExpiry: {
            type: Date
        }
    }, {
    timestamps: true,
},
);

// moogonse.model("User", userSchema)

//using pre hook
userSchema.pre("save", async function () {
    // CRITICAL CHECK: Only hash the password if it was actually modified
    if (!this.isModified("password")) return;
    
    // 3. Hash the plain text password with 10 rounds and replace it
    this.password = await bcrypt.hash(this.password, 10);
});

// userSchema.methods.isPasswordCorrect -> userSchema.methods = syntax, userSchema.methods._____ method name, we can write anything

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
}

//Generating Access Token
userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {//below data is called payload
            _id: this._id, //this is which mongoDB automatically generate with data
            email: this.email,
            username: this.username
        },
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn: process.env.ACCESS_TOKEN_EXPIRY}
    )
}

//Generating Refresh Token
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {//below data is called payload
        _id: this._id, //this is which mongoDB automatically generate with data
        },
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn: process.env.REFRESH_TOKEN_EXPIRY}
    )
}

//temporary token - token without data
userSchema.methods.generateTemporaryToken = function(){
    const unhashedToken = crytpo.randomBytes(20).toString("hex") //we are converting hex into string, crypto generates hex so we need to convert it

    //hashing
    const hashedToken = crytpo
                            .createHash("sha256") //sha256 is algorithm we used to hash
                            .update(unhashedToken)
                            .digest("hex")

    const tokenExpiry = Date.now() + (20*60*1000) //20mins

    return {unhashedToken, hashedToken, tokenExpiry}
}


export const User = moogonse.model("User", userSchema);