const express = require("express");
const { MongoClient, ObjectID } = require("mongodb");
const path = require("path");

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
  req.collection.insert(req.body, (e, results) => {
    if (e) return next(e);
    res.send(results.result.n === 1 ? { msg: "success" } : { msg: "error" });
  });
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
  const { ObjectID } = require("mongodb");
  const collectionName = req.params.collectionName;
  const id = req.params.id;

  try {
    // Convert ⁠ id ⁠ to ObjectID
    const query = { _id: new ObjectID(id) };
    const update = { $set: req.body };

    req.collection.updateOne(
      query,
      update,
      { safe: true, multi: false },
      (error, result) => {
        if (error) {
          console.error("Update error:", error);
          return next(error);
        }

        console.log("Update result:", result);
        if (result.matchedCount === 0) {
          console.error("No document found with this ID:", id);
        }

        res.send(
          result.matchedCount === 1 ? { msg: "success" } : { msg: "error" }
        );
      }
    );
  } catch (error) {
    console.error("Error in PUT route:", error);
    next(error);
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

// Get cart data (mocked for now, replace with actual cart data retrieval logic)
app.get("/cart", async (req, res) => {
  // Ideally, you would store cart data in the session or a database to persist it
  // For simplicity, we're using a mock cart here
  const cart = [
    { id: 1, title: "Math Lesson", price: 100, quantity: 2 },
    { id: 2, title: "Science Lesson", price: 120, quantity: 1 },
  ];

  res.status(200).json({ cart });
});

// Checkout route
app.post("/checkout", async (req, res) => {
  const cart = req.body.cart; // Cart data sent by frontend
  const userId = req.body.userId; // Optional: if you want to link the order to a user

  try {
    // Validate cart items and update availability
    for (const lesson of cart) {
      const dbLesson = await db.collection("products").findOne({
        title: lesson.title,
      });

      if (!dbLesson) {
        return res.status(404).json({
          msg: `Lesson ${lesson.title} not found.`,
        });
      }

      if (dbLesson.availability < lesson.quantity) {
        return res.status(400).json({
          msg: `Not enough availability for ${lesson.title}. Only ${dbLesson.availability} spots available.`,
        });
      }

      // Deduct availability
      await db
        .collection("products")
        .updateOne(
          { title: lesson.title },
          { $inc: { availability: -lesson.quantity } }
        );
    }

    // Save order to the Orders collection
    const order = { userId, lessons: cart, createdAt: new Date() };
    const result = await db.collection("Orders").insertOne(order);

    res.status(200).json({
      msg: "Order placed successfully",
      orderId: result.insertedId,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ msg: "Failed to place order" });
  }
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ msg: "Something went wrong!" });
});

var imagePath = path.resolve(__dirname, "assets");
app.use("/assets", express.static(imagePath));
app.get("/assets/:image", (request, response) => {
  response.status(404).send("Image not found");
});

// Start the server
app.listen(3000, () => {
  console.log("Express.js server running at localhost:3000");
});
