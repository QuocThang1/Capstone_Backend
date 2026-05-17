const accountDAO = require("../DAO/accountDAO");
const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const { StatusCodes } = require("http-status-codes");

const handleGoogleAuth = async (googleProfile) => {
    try {
        const { id, email, name, picture } = googleProfile;

        // Check if user exists by googleId
        let user = await accountDAO.findOne({ googleId: id });

        if (!user) {
            // Check if user exists by email
            user = await accountDAO.findByEmail(email);
            
            if (!user) {
                // Create new user
                const userData = {
                    googleId: id,
                    email,
                    fullName: name || email.split('@')[0] || 'Google User',
                    avatar: picture,
                    authProvider: "google",
                    role: "user",
                    active: true,
                };
                user = await accountDAO.createAccount(userData);
            } else {
                // Link Google account to existing user
                user = await accountDAO.updateAccount(user._id, {
                    googleId: id,
                    authProvider: "google",
                    avatar: picture || user.avatar,
                });
            }
        }

        if (!user.active) {
            throw new ApiError(StatusCodes.FORBIDDEN, "Your account has been deactivated");
        }

        const payload = {
            id: user._id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            dob: user.dob,
            gender: user.gender,
            role: user.role,
            avatar: user.avatar,
        };

        const access_token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN,
        });

        return {
            access_token,
            user: payload,
        };
    } catch (error) {
        throw error;
    }
};

const handleGitHubAuth = async (githubProfile) => {
    try {
        const { id, name, email, avatar_url } = githubProfile;

        // Check if user exists by githubId
        let user = await accountDAO.findOne({ githubId: id.toString() });

        if (!user) {
            // Check if user exists by email
            if (email) {
                user = await accountDAO.findByEmail(email);
            }
            
            if (!user) {
                // Create new user
                const userData = {
                    githubId: id.toString(),
                    email: email || `github-${id}@github.com`,
                    fullName: name || `GitHub User ${id}`,
                    avatar: avatar_url,
                    authProvider: "github",
                    role: "user",
                    active: true,
                };
                user = await accountDAO.createAccount(userData);
            } else {
                // Link GitHub account to existing user
                user = await accountDAO.updateAccount(user._id, {
                    githubId: id.toString(),
                    authProvider: "github",
                    avatar: avatar_url || user.avatar,
                });
            }
        }

        if (!user.active) {
            throw new ApiError(StatusCodes.FORBIDDEN, "Your account has been deactivated");
        }

        const payload = {
            id: user._id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            dob: user.dob,
            gender: user.gender,
            role: user.role,
            avatar: user.avatar,
        };

        const access_token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN,
        });

        return {
            access_token,
            user: payload,
        };
    } catch (error) {
        throw error;
    }
};

module.exports = {
    handleGoogleAuth,
    handleGitHubAuth,
};
