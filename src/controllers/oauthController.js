const axios = require('axios');
const { handleGoogleAuth, handleGitHubAuth } = require("../services/oauthService");
const { StatusCodes } = require("http-status-codes");
const { createAuditLog } = require("../services/adminAuditLogService");
const { env } = require("../config/env");

const writeLoginAuditLog = (req, user, provider) => createAuditLog(req, {
    actorId: user?._id,
    actor: user?.fullName || user?.email || user?.username || "User",
    action: "User logged in",
    target: user?.email || user?.username || "User account",
    details: `Logged in with ${provider}.`,
}).catch((error) => console.error("Unable to write audit log:", error.message));

const handleGoogleCallback = async (req, res, next) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                EC: 1,
                EM: "Authorization code is required"
            });
        }

        // Exchange authorization code for tokens
        const tokenResponse = await axios.post(
            'https://oauth2.googleapis.com/token',
            {
                client_id: env.oauth.googleClientId,
                client_secret: env.oauth.googleClientSecret,
                code,
                grant_type: 'authorization_code',
                redirect_uri: 'postmessage'
            }
        );

        const { id_token, access_token } = tokenResponse.data;

        if (!id_token) {
            throw new Error('Failed to get ID token from Google');
        }

        // Get user info from Google userinfo endpoint
        const userInfoResponse = await axios.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            {
                headers: {
                    Authorization: `Bearer ${access_token}`
                }
            }
        );

        const googleProfile = {
            id: userInfoResponse.data.id,
            email: userInfoResponse.data.email,
            name: userInfoResponse.data.name || userInfoResponse.data.given_name || 'Google User',
            picture: userInfoResponse.data.picture,
        };

        const data = await handleGoogleAuth(googleProfile);
        await writeLoginAuditLog(req, data.user, "Google");

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Login with Google successful",
            access_token: data.access_token,
            data: data.user
        });
    } catch (error) {
        next(error);
    }
};

const handleGitHubCallback = async (req, res, next) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                EC: 1,
                EM: "Authorization code is required"
            });
        }

        // Exchange code for token
        const tokenResponse = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: env.oauth.githubClientId,
                client_secret: env.oauth.githubClientSecret,
                code,
            },
            {
                headers: {
                    Accept: 'application/json',
                },
            }
        );

        const { access_token } = tokenResponse.data;

        if (!access_token) {
            throw new Error('Failed to get access token from GitHub');
        }

        // Get user info from GitHub
        const userResponse = await axios.get('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${access_token}`,
                Accept: 'application/json',
            },
        });

        // Get user email if not in profile
        let userEmail = userResponse.data.email;
        if (!userEmail) {
            try {
                const emailResponse = await axios.get('https://api.github.com/user/emails', {
                    headers: {
                        Authorization: `Bearer ${access_token}`,
                        Accept: 'application/json',
                    },
                });

                const primaryEmail = emailResponse.data.find(e => e.primary);
                userEmail = primaryEmail?.email || emailResponse.data[0]?.email;
            } catch (e) {
                // If we can't get email, continue without it
            }
        }

        const githubProfile = {
            id: userResponse.data.id,
            name: userResponse.data.name || userResponse.data.login,
            email: userEmail,
            avatar_url: userResponse.data.avatar_url,
        };

        const data = await handleGitHubAuth(githubProfile);
        await writeLoginAuditLog(req, data.user, "GitHub");

        return res.status(StatusCodes.OK).json({
            EC: 0,
            EM: "Login with GitHub successful",
            access_token: data.access_token,
            data: data.user
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    handleGoogleCallback,
    handleGitHubCallback,
};
