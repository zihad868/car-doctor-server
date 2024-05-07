const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 4000;
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
dotenv.config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { filter } = require('lodash');

// middleware
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

console.log(process.env.DB_USER);
console.log(process.env.DB_PASS);


var uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ac-62j8ihz-shard-00-00.7lbrva6.mongodb.net:27017,ac-62j8ihz-shard-00-01.7lbrva6.mongodb.net:27017,ac-62j8ihz-shard-00-02.7lbrva6.mongodb.net:27017/?ssl=true&replicaSet=atlas-g1t94d-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Custom middleware

const logger = async(req, res, next) => {
   console.log("Called-->", req.host, req.originalUrl);
   next();
}

const verifyToken = async(req, res, next) => {
   const token = req.cookies?.token;

   if(!token){
     return res.status(401).send({message: 'Unauthorized Access'})
   }

   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(401).send({message: 'Unauthorized Access'})
    }
    req.user = decoded;
    next();
   })


}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection

    const serviceCollection = client.db('CarSercicesDB').collection('services');
    const bookingCollection = client.db('CarSercicesDB').collection('booking');

    // Auth Related API
    app.post('/jwt', logger, async(req, res) => {
       const user = req.body;
       console.log("68--->",user);
       console.log(process.env.ACCESS_TOKEN_SECRET);
       const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1hr'})
       res
       .cookie('token', token, {
        httpOnly: true,
        security: false,
        sameSite: 'strict'
       })
        .send({success: true});
    })


    // Services
    app.get('/services', logger, async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });


    app.get('/services/:id', logger, verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };

      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    });

    // Booking

    app.get('/bookings', logger, verifyToken, async (req, res) => {
      console.log(req.query);

      // if(req.query.email !== req.user.email){
      //   return res.status(402).send({message: 'Forbidden Access'})
      // }

      if(req.query.email){
         query = {email: req.query.email};
      }
      const cursor = bookingCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post('/booking', logger, async (req, res) => {
      const body = req.body;
      const result = await bookingCollection.insertOne(body);
      res.send(result);
    });

    app.delete('/booking/:id', logger, async(req, res) => {
       const id = req.params.id;
       const query = {_id: new ObjectId(id)};
       const result = await bookingCollection.deleteOne(query);

       res.send(result);
    })

    app.patch('/booking/:id', logger, async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const updatedBook = req.body;
      console.log("Updated--->",updatedBook);
      const updateDoc = {
        $set: {
          status: updatedBook.status
        },
      };
      const result = await bookingCollection.updateOne(query, updateDoc);
      res.send(result);
      console.log(result);
    })


    await client.db('admin').command({ ping: 1 });
    console.log('Pinged your deployment. You successfully connected to MongoDB!');
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', async (req, res) => {
  res.send('Car server is Running');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
