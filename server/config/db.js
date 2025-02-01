module.exports = {
  url: process.env.MONGODB_URI,
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    auth: {
      user: process.env.DB_USER,
      password: process.env.DB_PASS
    }
  }
} 