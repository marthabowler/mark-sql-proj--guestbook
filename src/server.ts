import express from "express";
import cors from "cors";
import { Client } from "pg";
import { sign } from "crypto";
import { type } from "os";

//As your database is on your local machine, with default port,
//and default username and password,
//we only need to specify the (non-default) database name.

const client = new Client({ database: "guestbook" });

//TODO: this request for a connection will not necessarily complete before the first HTTP request is made!
client.connect();

const app = express();

/**
 * Simplest way to connect a front-end. Unimportant detail right now, although you can read more: https://flaviocopes.com/express-cors/
 */
app.use(cors());

/**
 * Middleware to parse a JSON body in requests
 */
app.use(express.json());

//When this route is called, return the most recent 100 signatures in the db
app.get("/signatures", async (req, res) => {
  try {
    const allSignatures = await client.query(
      "SELECT * FROM signatures LIMIT 100"
    );
    res.status(200).json({
      status: "success",
      data: allSignatures.rows,
    });
  } catch (err) {
    console.error(err);
  }
});

app.get("/signatures/:id", async (req, res) => {
  const { id } = req.params;
  // :id indicates a "route parameter", available as req.params.id
  //  see documentation: https://expressjs.com/en/guide/routing.html
  const result = await client.query("SELECT * FROM signatures WHERE id = $1", [
    id,
  ]);
  console.log(result.rowCount);

  if (result.rowCount === 1) {
    const signature = await client.query(
      "SELECT * FROM signatures WHERE id=$1",
      [id]
    );
    res.status(200).json({
      status: "success",
      data: signature.rows,
    });
  } else {
    res.status(404).json({
      status: "fail",
      data: {
        id: "Could not find a signature with that id identifier",
      },
    });
  }
});

app.post("/signatures", async (req, res) => {
  const { name, message } = req.body;
  if (typeof name === "string") {
    const createdSignature = await client.query(
      "INSERT INTO signatures VALUES (default, $1, $2) RETURNING *",
      [name, message]
    );
    res.status(201).json({
      status: "success",
      data: {
        signature: createdSignature.rows, //return the relevant data (including its db-generated id)
      },
    });
  } else {
    res.status(400).json({
      status: "fail",
      data: {
        name: "A string value for name is required in your JSON body",
      },
    });
  }
});

//update a signature.
app.put("/signatures/:id", async (req, res) => {
  //  :id refers to a route parameter, which will be made available in req.params.id
  const { name, message } = req.body;
  const { id } = req.params;
  if (typeof name === "string") {
    const result = await client.query(
      "SELECT * FROM signatures WHERE id = $1",
      [id]
    );
    console.log(result.rowCount);

    if (result.rowCount === 1) {
      const updatedSignature = await client.query(
        "UPDATE signatures SET signature = $1, message= $2 WHERE id= $3",
        [name, message, id]
      );
      res.status(200).json({
        status: "success",
        data: {
          signature: updatedSignature.rows[0],
        },
      });
    } else {
      res.status(404).json({
        status: "fail",
        data: {
          id: "Could not find a signature with that id identifier",
        },
      });
    }
  } else {
    res.status(404).json({
      status: "fail",
      data: {
        id: "Could not find a signature with that id identifier",
      },
    });
  }
});

app.delete("/signatures/:id", async (req, res) => {
  const { id } = req.params; // params are string type

  const queryResult = await client.query(
    "DELETE FROM signatures WHERE id = $1",
    [id]
  );
  const didRemove = queryResult.rowCount === 1;

  if (didRemove) {
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/DELETE#responses
    // we've gone for '200 response with JSON body' to respond to a DELETE
    //  but 204 with no response body is another alternative:
    //  res.status(204).send() to send with status 204 and no JSON body
    res.status(200).json({
      status: "success",
    });
  } else {
    res.status(404).json({
      status: "fail",
      data: {
        id: "Could not find a signature with that id identifier",
      },
    });
  }
});

export default app;
