
const serverless = require("serverless-http");
const { app, connectDB } = require("../../server");

let dbConnection;

const serverlessHandler = serverless(app, {
  basePath: "/.netlify/functions/api",
});

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
    console.error("NETLIFY API ERROR:", error);

    return {
      statusCode: 503,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        message: "Backend or database connection failed",
        error: error.message,
      }),
    };
  }
};
