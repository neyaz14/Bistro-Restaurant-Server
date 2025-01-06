const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_key}@cluster0.epj76.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const menuCollection = client.db("BistroBoss").collection("menu");
    const reviewCollection = client.db("BistroBoss").collection("reviews");
    const cartsCollection = client.db("BistroBoss").collection("carts");
    const userCollection = client.db("BistroBoss").collection("users");

    app.get('/menu', async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });
    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    // carts collection 
    // app.get('/carts', async (req, res) => {
    //   // const email = req.query.email;
    //   // const query = { email: email };
    //   const result = await cartsCollection.find(\).toArray();
    //   res.send(result);
    // }); 
    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      const query = { userEmail: email };
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/carts', async (req, res) => {
      const cartItem = req.body;
      const result = await cartsCollection.insertOne(cartItem);
      res.send(result);
    });


    //  cart delete from /dashboard/api
    app.delete('/carts/:id', async (req, res) => {
      try {
        const id = req.params.id;
        // console.log(id)
        const query = { _id: new ObjectId(id) }
        const result = await cartsCollection.deleteOne(query);
        res.send(result);
      }
      catch (error) {
        console.error('Error deleting cart item:', error);

      }
    })

//----------------- user data   --------------------
app.post("/users", async (req, res) => {
  const user = req.body;
  const query = { email: user.email };
  const existingUser = await userCollection.findOne(query);
  if (existingUser) {
    return res.send({ message: "user already exists", insertedId: null });
  }
  const result = await userCollection.insertOne(user);
  res.send(result);
});

app.get("/users",  async (req, res) => {
  const result = await userCollection.find().toArray();
  res.send(result);
});

app.delete("/users/:id",  async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await userCollection.deleteOne(query);
  res.send(result);
});
// to make user an admin
app.patch("/users/admin/:id",  async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updatedDoc = {
    $set: {
      role: "admin",
    },
  };
  const result = await userCollection.updateOne(filter, updatedDoc);
  res.send(result);
});





























    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('boss is sitting')
})

app.listen(port, () => {
  console.log(`Bistro boss is sitting on port ${port}`);
})