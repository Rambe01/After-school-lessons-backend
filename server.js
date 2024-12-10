const express = require("express");
const { MongoClient, ObjectID } = require("mongodb");

const app = express();
app.use(express.json());
app.set("port", 3000);

// CORS middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // Consider restricting origins in production
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Access-Control-Allow-Headers, Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers"
  );
  next();
});

// MongoDB URI and Database
const mongoURI =
  "mongodb+srv://tamberohan995:rohan123@coursework.cs4lb.mongodb.net/CourseWork?retryWrites=true&w=majority";
let db;

// Connect to MongoDB
MongoClient.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then((client) => {
    db = client.db("Afterschoolclub");
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    console.error("MongoDB URI:", mongoURI);
    process.exit(1);
  });

// Routes
app.get("/", (req, res) => {
  res.send("Select a collection, e.g., /collections/products");
});

// Middleware to access the collection dynamically
app.param("collectionName", (req, res, next, collectionName) => {
  req.collection = db.collection(collectionName);
  return next();
});

// Get all items from a collection
app.get("/collections/:collectionName", async (req, res, next) => {
  try {
    const results = await req.collection.find({}).toArray();
    res.send(results);
  } catch (e) {
    next(e);
  }
});

// Add a new item to a collection
app.post("/collections/:collectionName", async (req, res, next) => {
  try {
    const result = await req.collection.insertOne(req.body);
    res.send(result.ops);
  } catch (e) {
    next(e);
  }
});

// Get an item by ID from a collection
app.get("/collections/:collectionName/:id", async (req, res, next) => {
  try {
    const result = await req.collection.findOne({
      _id: new ObjectID(req.params.id),
    });
    res.send(result);
  } catch (e) {
    next(e);
  }
});

// Update an item in a collection by title
app.put("/collections/:collectionName/:title", async (req, res, next) => {
  try {
    const lesson = await req.collection.findOne({ title: req.params.title });
    if (!lesson) {
      return res.status(404).send({ msg: "Lesson not found" });
    }
    const result = await req.collection.updateOne(
      { title: req.params.title },
      { $set: req.body }
    );
    res.send(result.result.n === 1 ? { msg: "success" } : { msg: "error" });
  } catch (e) {
    next(e);
  }
});

// Place an order route
app.post("/placeOrder", async (req, res) => {
  console.log("Received order:", req.body);

  const order = req.body;
  const lessons = order.lessons;

  try {
    // Validate lessons
    for (const lesson of lessons) {
      const dbLesson = await db.collection("products").findOne({
        title: lesson.lessonTitle,
      });

      if (!dbLesson) {
        return res.status(404).json({
          msg: `Lesson ${lesson.lessonTitle} not found.`,
        });
      }

      if (dbLesson.availability < lesson.quantity) {
        return res.status(400).json({
          msg: `Not enough availability for ${lesson.lessonTitle}. Only ${dbLesson.availability} spots available.`,
        });
      }

      // Deduct availability
      await db
        .collection("products")
        .updateOne(
          { title: lesson.lessonTitle },
          { $inc: { availability: -lesson.quantity } }
        );
    }

    // Insert the order into the Orders collection
    const result = await db.collection("Orders").insertOne(order);

    console.log("Order successfully inserted:", result.insertedId);

    // Respond with success
    res.status(200).json({
      msg: "Order placed successfully",
      orderId: result.insertedId,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ msg: "Failed to place order" });
  }
});

// Delete an item by ID from a collection
app.delete("/collections/:collectionName/:id", async (req, res, next) => {
  try {
    const result = await req.collection.deleteOne({
      _id: new ObjectID(req.params.id),
    });
    res.send(result.result.n === 1 ? { msg: "success" } : { msg: "error" });
  } catch (e) {
    next(e);
  }
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ msg: "Something went wrong!" });
});

// Start the server
app.listen(3000, () => {
  console.log("Express.js server running at localhost:3000");
});
