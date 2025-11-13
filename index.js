const express = require("express");
require('dotenv').config();
const cors = require("cors");
const { MongoClient, ServerApiVersion, Collection, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

const admin = require("firebase-admin");

const serviceAccount = require("./admin-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});


// middleWar
app.use(cors());
app.use(express.json());
const verifyToken = async(req,res,next)=>{
   if (!req.headers.authorization){
      return res.status(401).send({message:"UnAuthorized Access"})
   } 
   const token = req.headers.authorization.split(' ')[1]
    try {
      
      const userInfo =  await admin.auth().verifyIdToken(token);
      req.token_owner = userInfo.email
       next();
    } catch {
      return res.status(401).send({ message: "UnAuthorized Access" });
      
    }




}



const uri = `mongodb+srv://${process.env.DB_USERS}:${process.env.DB_PASS}@cluster0.tcugfjh.mongodb.net/?appName=Cluster0`;

// mongoDb connect

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("cleanify-DB");
    const issueContributeColl = db.collection("issueContribute");
    const issuesColl = db.collection("issues")

    // ---------------Issues Collection------------
    
     app.get("/issuesLimit", async (req, res) => {
       const cursor = issuesColl.find().sort({date: -1}).limit(6);
       const result = await cursor.toArray()
       res.send(result);
     });

      app.get("/issueDetails/:id", async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await issuesColl.findOne(query);
        res.send(result);
      });
      app.get("/issues",verifyToken, async (req, res) => {
        const email = req.query.email;
        const query = {};
        if (email) {
          if (email !== req.token_owner) {
            return res.status(403).send({ message: "Forbidden Access" });
          }
          query.email = email;
        }
        const cursor = issuesColl.find(query);
        const result = await cursor.toArray();
        res.send(result);
      });
     
    app.post('/issues',async(req,res)=>{
        const newIssue = req.body;
        const result = await  issuesColl.insertOne(newIssue)
        res.send(result)
    })
     

    app.patch('/issues/:id',async(req,res)=>{
       const id = req.params.id;
       const query = { _id: new ObjectId(id) };
       const updateIssue = req.body;
       const update ={
        $set: updateIssue
       }
       const result = await issuesColl.updateOne(query,update)
       res.send(result);
    })

    app.delete('/issues/:id',async(req,res)=>{
        const id = req.params.id;
        const query = { _id : new ObjectId(id) }
        const result = await issuesColl.deleteOne(query)
        res.send(result)
    })
    // ----------Issue-contribution--------------

    app.get("/contributes",verifyToken ,async(req,res)=>{
        const email = req.query.email
        const query = {}
        if(email){
          if(email !== req.token_owner){
                return  res.status(403).send({ message: "Forbidden Access" });
          }
          query.email = email
        }
        const cursor = issueContributeColl.find(query)
        const result = await cursor.toArray()
        res.send(result)
    });

    app.get('/issues/contributes/:id',async(req,res)=>{
          const id = req.params.id
          const query = { Contribute_id: id };
          const cursor = issueContributeColl.find(query).sort({amount: -1});
          const result = await cursor.toArray()
          res.send(result)
    })

    app.post('/contributes',async(req,res)=>{
        const newContribute =req.body
        const result = await issueContributeColl.insertOne(newContribute)
        res.send(result)
    })
     


    











    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // nothing
  }
}

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`cleanify app listening on port ${port}`);
});

run().catch(console.dir);
