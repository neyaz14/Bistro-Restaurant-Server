const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
// This is your test secret API key.
require('dotenv').config()
const stripe = require("stripe")(process.env.Stripe_key);
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));


const { MongoClient, ServerApiVersion, ObjectId, Admin } = require('mongodb');

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
    const paymentCollection = client.db("BistroBoss").collection("payments");




    //------------------>>   jwt token api  ----
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      // console.log(user)
      const token = jwt.sign(user, process.env.Secrect_key_accessToken, { expiresIn: '1h' });
      res.send({ token });
    })






    // ------------------- middelware -------------------
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.Secrect_key_accessToken, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }
    // check user if he is admin 
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isadmin = user.role === 'admin';
      if (!isadmin) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next();
    }

    // ----------------- to make user an admin
    app.patch("/users/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
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

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let isadmin = false;
      if (user) {
        isadmin = user.role === 'admin'
      }
      // console.log(isadmin)
      res.send({ isadmin })
    })






    app.get('/menu', async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });
    app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
      const menuItem = req.body;
      const result = await menuCollection.insertOne(menuItem);
      res.send(result);
    });

    app.get('/menu/:id', async (req, res) => {
      const id = req.params.id;
      let result;
      try {
        const objectIdQuery = { _id: new ObjectId(id) };
        result = await menuCollection.findOne(objectIdQuery);
      } catch (error) {
        console.warn('Invalid ObjectId format:', error);
      }

      if (!result) {
        const objectQuery = { _id: id };
        result = await menuCollection.findOne(objectQuery);
        // console.log('res from second :', result)
      }

      if (result) {
        res.send(result);
      } else {
        res.status(404).send({ message: 'Document not found' });
      }

    })



    app.delete('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      let result;
      let founded;
      try {
        const objectIdQuery = { _id: new ObjectId(id) };
        founded = await menuCollection.findOne(objectIdQuery);
        result = await menuCollection.deleteOne(objectIdQuery);
        // console.log("from Objectid res:", result, ",  id:" ,objectIdQuery)
      } catch (error) {
        console.warn('Invalid ObjectId format:', error);
      }
      if (!founded) {
        const objectQuery = { _id: id };
        founded = await menuCollection.findOne(objectQuery);
        result = await menuCollection.deleteOne(objectQuery);
        // console.log("from id res:", result, ",  id:" ,objectQuery)
      }
      // console.log(founded)
      if (founded) {
        res.send(result);
      } else {
        res.status(404).send({ message: 'Document not found' });
      }
      // res.send(result)
    })

    // TODO : Does work successfully 
    app.patch('/menu/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          name: item.name,
          category: item.category,
          price: item.price,
          recipe: item.recipe,
          image: item.image
        }
      }

      const result = await menuCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })



    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

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

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });


    //--------------------------- Stripe payment intent ------------

    // // creating payment intent
    // app.post('/create-payment-intent', async (req,res)=>{
    //   const {price } = req.body;
    //   const amount = parseInt(price * 100);
    //   const paymentIntent = await stripe.paymentIntents({
    //     amount: calculateOrderAmount(price),
    //     currency: 'usd',
    //     payment_methods_types:['card'],
    //     automatic_payment_methods: {
    //       enabled: true,
    //     },
    //   });
    //   res.send({clientSecret: paymentIntent.client_secret,});
    // })
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });


    // for payment info 
    app.post('/payments', async (req, res) => {
      const paymentInfo = req.body;
      const paymentResult = await paymentCollection.insertOne(paymentInfo);

      // console.log('payment info', paymentInfo);
      //  carefully delete each item from the cart
      const query = {
        _id: {
          $in: paymentInfo.cartIds.map(id => new ObjectId(id))
        }
      };

      const deleteResult = await cartsCollection.deleteMany(query);

      res.send({ paymentResult, deleteResult });
      // res.send(paymentResult);
    })
    app.get('/payments/:email', verifyToken, async (req, res) => {
      const query = { email: req.params.email }
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })






















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