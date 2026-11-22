const path = require('path')
const express = require('express')
const cors = require('cors')
const dns = require('dns')
require('dotenv').config({ path: '.env' })

const { connectDB } = require('./db/connect.js')
const notFoundMiddleware = require('./middleware/not_found.js')
const errorHandlerMiddleware = require('./middleware/error_handler.js')
const fsFiles = require('./routes/fsFile.js')

dns.setServers(['8.8.8.8', '8.8.4.4'])
const app = express()

// middleware
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

if (process.env.FRONTEND_URL) {
    app.use(cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
        exposedHeaders: ['Content-Disposition']
    }))
}

// routes
app.use('/api/v1/fsfiles', fsFiles)

// SPA fallback for frontend routes
app.get('/*splat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// errors handling
app.use(notFoundMiddleware)
app.use(errorHandlerMiddleware)

const port = process.env.PORT || 5000
const start = async () => {
    try {
        await connectDB(process.env.MONGO_URI)

        app.listen(port, () => {
            console.log(`Server is listening on port ${port}...`)
        })
    } catch (error) {
        console.log(error)
    }
}

start()