const serverless = require("serverless-http");
const { app, connectDB } = require("../../server");

let dbConnection;

const serverlessHandler = serverless(app);

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    if (!dbConnection) {
      dbConnection = connectDB().catch((error) => {
        dbConnection = null;
        throw error;
      });
    }

    await dbConnection;

    return await serverlessHandler(event, context);
  } catch (error) {
    console.error("NETLIFY API ERROR:", error.message);

    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        message: "Database connection failed. Make sure 0.0.0.0/0 is allowed in MongoDB Atlas Network Access.",
        error: error.message,
      }),
    };
  }
};
