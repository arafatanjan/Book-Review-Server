require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;


// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URL;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("userDB");
    const collection = db.collection("userCollection");
    const reviewDB = client.db("reviewDB");
    const reviewcollection = reviewDB.collection("reviewcollection");

    // User Registration
    app.post("/api/v1/register", async (req, res) => {
      const { username, email, password } = req.body;

      // Check if email already exists
      const existingUser = await collection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exist!!!",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the database
      const data=await collection.insertOne({
        username,
        email,
        password: hashedPassword,
        role: "user",
      });

      res.status(201).json({
        success: true,
        message: "User registered successfully!",
        data: data
      });
    });

 
// Update user into the database
app.patch("/user/:email", async (req, res) => {
  const email = req.params.email;
  const userData = req.body;

  try {
    const result = await collection.updateOne(
      { email }, 
      { $set: userData }, 
    );

    if (result.modifiedCount === 0 && result.upsertedCount === 0) {
      // If no documents were updated or inserted, return a 404 status
      return res.status(404).json({
        success: false,
        message: "User not found or no changes made.",
      });
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully!",
      data: result,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

    // User Login
    app.post("/api/v1/login", async (req, res) => {
      const { email, password } = req.body;

      // Find user by email
      const user = await collection.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign(
        {id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.EXPIRES_IN,
        }
      );

      res.json({
        success: true,
        message: "User successfully logged in!",
        accessToken: token,
      });
    });

    //add review
    app.post('/review',  async (req, res) => {
      const reviews=  req.body;
      const result = await reviewcollection.insertOne(reviews);
      res.send(result);
});

// Route for fetching a review by ID
app.get('/reviews/:id', async (req, res) => {
  const reviewId = req.params.id;

  try {
    const review = await reviewcollection.findOne({ _id: new ObjectId(reviewId) });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    res.json(review);
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//Route for update review
app.patch("/review/update/:id", async (req, res) => {
  const id = req.params.id;

  // Check if the ID is a valid MongoDB ObjectId
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  const updatedData = req.body;
  try {
    const result = await reviewcollection.updateOne(
      { _id: new ObjectId(id) },  
      { $set: updatedData }        
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (result.modifiedCount === 0) {
      return res.status(200).json({ message: 'No changes made to the review' });
    }

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      result,
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//Route for update review
app.delete('/review/:id', async (req, res) => {
  const id= req.params.id
  // const updatedData= req.body;
   const result = await reviewcollection.deleteOne(
      { _id: new ObjectId(id)}
  );
   res.send( result);
});

app.delete('/courses/:id', async (req, res) => {
  const id= req.params.id
  // const updatedData= req.body;
   const result = await ballcollection.deleteOne(
      { _id: new ObjectId(id)}
  );
   res.send( result);
});

//show in homepage
app.get('/reviews', async (req, res) => {
  const balls=  reviewcollection.find();
  const result = await balls.toArray();
  res.send(result);
});

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } finally {
  }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "Server is running smoothly",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});
