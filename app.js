const express = require('express')
const app = express()
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const dbPath = path.join(__dirname, 'userData.db')
const bcrypt = require('bcrypt') //(Here bcrypt package used because storing a plain password is not a good idea since they can be miss used because of this we used bcrypt package to make password unpredictable)
app.use(express.json())
const jwt = require('jsonwebtoken')
const cors=require("cors")

app.use(cors())
const Port=3005
const saltRounds=10
let db = null
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(Port, () => {
      console.log(`server running successfully @ ${Port}`)
    })
  } catch (e) {
    console.log(`DB Error:${e.message}`)
    process.exit(1)
  }
}
initializeDBAndServer()

//User Registration

app.post('/register', async (request, response) => {
  const {id,username, password} = request.body
  const hashedPassword = await bcrypt.hash(password, saltRounds)
  const selectUserQuery = `select * from users where username="${username}"`
  const dbuser = await db.get(selectUserQuery)

  if (dbuser === undefined) {
    const createUserQuery = `INSERT INTO users (id,username,password)
    VALUES
    (${id},"${username}","${hashedPassword}");
    `

    await db.run(createUserQuery)
    response.status(201)
    response.send('User Registered SuccessFully')
  } else {
    response.status(400)
    response.send('User Already Exists!!')
  }
})

app.post('/login', async (request, response) => {
    const {username, password} = request.body
    const selectUserQuery = `select * from users where username="${username}"`
    const dbuser = await db.get(selectUserQuery)
    if (dbuser === undefined) {
      response.status(400)
      response.send('Invalid User')
    } else {
      const isPasswordMatched = await bcrypt.compare(password, dbuser.password)
      //console.log(isPasswordMatched)
      if (isPasswordMatched === true) {
        response.status(200)
        const payload = {username}
        const jwtToken = jwt.sign(payload, 'TOKEN')
        response.send({jwtToken})
      } else {
        response.status(400)
        response.send('Invalid Password')
      }
    }
  })

//MIDDLEWARE FUNCTION
const authentication = (request, response, next) => {
    const authHeader = request.headers['authorization']
    let jwtToken
    if (authHeader !== undefined) {
      jwtToken = authHeader.split(' ')[1]
    }
    if (jwtToken === undefined) {
      response.status(400)
      response.send('Token not Provided')
    } else {
      jwt.verify(jwtToken, 'TOKEN', async (error, payload) => {
        if (error) {
          response.status(400)
          response.send('Token not provided, please login and after that access the content')
        } else {
          next()
        }
      })
    }
  }



//GET
app.get('/todos',authentication,async (request, response) => {
    const getProductQuery = `select * from to_do_items;`
    const productsArray = await db.all(getProductQuery)
    response.send(productsArray)
  })

  //POST

app.post('/todos',authentication,async (request, response) => {
    const {id,user_id,description,status} = request.body
    const createProduct = `INSERT INTO to_do_items (id,user_id,description,status)
    VALUES
    (${id},${user_id},"${description}","${status}");`
    await db.run(createProduct)
    response.send('Todo Added Successfully')
  })
  
  app.put('/todos/:todoid',authentication,async (request, response) => {
    const {todoid} = request.params
    const {id,user_id,description,status} = request.body
    const updateProductQuery = `UPDATE to_do_items
    SET
    id=${id},
    user_id=${user_id},
   description='${description}',
    status="${status}"
    where
    id=${todoid}
    ;`
  
    await db.run(updateProductQuery)
    response.send('Todo Updated SuccessFully')
  })

  //DELETE

  app.delete('/todos/:todoid',authentication,async (request, response) => {
    const {todoid} = request.params
    const deleteQuery = `DELETE FROM to_do_items where id=${todoid}`
    await db.run(deleteQuery)
    response.send('Todo Deleted Successfully')
  })