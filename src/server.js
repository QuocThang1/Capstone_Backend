const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

const express = require('express')
const cors = require('cors')
const http = require('http')

const errorHandlingMiddleware = require('./middleware/errorHandling')

const accountRouter = require('./routes/accountRoutes')
const userRouter = require('./routes/userRoutes')
const projectRouter = require('./routes/projectRoutes')

const connection = require("./config/database");

const app = express()
const server = http.createServer(app)

const port = process.env.PORT || 8080
const host = process.env.HOST || 'localhost'

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/v1/api/account', accountRouter);
app.use('/v1/api/users', userRouter);
app.use('/v1/api/projects', projectRouter);

app.use(errorHandlingMiddleware);

(async () => {
    try {
        await connection();

        server.listen(port, host, () => {
            console.log(`Backend listening at http://${host}:${port}`)
        })
    } catch (error) {
        console.error("Error connecting to DB:", error);
        process.exit(1);
    }
})();
