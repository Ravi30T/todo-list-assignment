const express = require('express')

const path = require('path')

const {open} = require('sqlite')

const sqlite3 = require('sqlite3')

const dateValid = require('date-fns/isValid')

const dateFormat = require('date-fns/format')

const toDate = require('date-fns/toDate')

const app = express()

app.use(express.json())

const dbPath = path.join(__dirname, 'todoApplication.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log(`Server Running at http://localhost/3000/`)
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

const checkRequestQueries = async (request, response, next) => {
  const {search_q, category, priority, status, date} = request.query

  const {todoId} = request.params

  if (category !== undefined) {
    const categoryArray = ['WORK', 'HOME', 'LEARNING']
    const categoryIsInArray = categoryArray.includes(category)

    if (categoryIsInArray === true) {
      request.category = category
    } else {
      response.status(400)
      response.send('Invalid Todo Category')
      return
    }
  }

  if (priority !== undefined) {
    const priorityArray = ['HIGH', 'MEDIUM', 'LOW']
    const priorityIsInArray = priorityArray.includes(priority)

    if (priorityIsInArray === true) {
      request.priority = priority
    } else {
      response.status(400)
      response.send('Invalid Todo Priority')
      return
    }
  }

  if (status !== undefined) {
    const statusArray = ['TO DO', 'IN PROGRESS', 'DONE']
    const statusIsInArray = statusArray.includes(status)

    if (statusIsInArray === true) {
      request.status = status
    } else {
      request.status(400)
      request.send('Invalid Todo Status')
    }
  }

  if (date !== undefined) {
    try {
      const myDate = new Date(date)

      const formattedDate = format(new Date(date), 'yyyy-MM-dd')

      const result = toDate(
        new Date(
          `${myDate.getFullYear()}-${
            myDate.getMonth() + 1
          }-${myDate.getDate()}`,
        ),
      )

      const isValidDate = await isValid(result)

      if (isValidDate === true) {
        request.date = formattedDate
      } else {
        response.status(400)
        response.send('Invalid Due Date')
        return
      }
    } catch (e) {
      response.status(400)
      response.send('Invalid Due Date')
      return
    }
  }

  request.todoId = todoId
  request.search_q = search_q

  next()
}

const checkRequestsBody = (request, response, next) => {
  const {id, todo, category, priority, status, dueDate} = request.body
  const {todoId} = request.params

  if (category !== undefined) {
    const categoryArray = ['WORK', 'HOME', 'LEARNING']

    const categoryIsInArray = categoryArray.includes(category)

    if (categoryIsInArray === true) {
      request.category = category
    } else {
      response.status(400)
      response.send('Invalid Todo Category')
      return
    }
  }

  if (priority !== undefined) {
    const priorityArray = ['HIGH', 'MEDIUM', 'LOW']

    const priorityIsInArray = priorityArray.includes(priority)

    if (priorityIsInArray === true) {
      request.priority = priority
    } else {
      response.status(400)
      response.send('Invalid Todo Priority')
      return
    }
  }

  if (status !== undefined) {
    const statusArray = ['To DO', 'IN PROGRESS', 'DONE']

    const statusIsInArray = statusArray.includes(status)

    if (statusIsInArray === true) {
      request.status = status
    } else {
      response.status(400)
      response.send('Invalid Todo Status')
      return
    }
  }

  if (dueDate !== undefined) {
    try {
      const myDate = new Date(dueDate)

      const formattedDate = format(new Date(dueDate), 'yyyy-MM-dd')

      const result = toDate(new Date(formattedDate))

      const isValidDate = isValid(result)

      if (isValidDate === true) {
        request.dueDate = formattedDate
      } else {
        response.status(400)
        response.send('Invalid Due Date')
        return
      }
    } catch (e) {
      response.status(400)
      response.send('invalid Due Date')
      return
    }
  }

  request.todo = todo
  request.id = id

  request.todoId = todoId

  next()
}

// API - 1 GET Todos

app.get('/todos/', checkRequestQueries, async (request, response) => {
  const {status = '', search_q = '', priority = '', category = ''} = request

  const getTodosQuery = `SELECT id, todo, priority, status, category, due_date AS dueDate FROM todo 
  WHERE todo LIKE '%${search_q}%' AND priority LIKE '%${priority}%' AND status LIKE '%${status}%' AND category LIKE '%${category}%';`

  const todosList = await db.all(getTodosQuery)
  response.send(todosList)
})

// API - 2 GET Todo using Todo ID

app.get('/todos/:todoId', checkRequestQueries, async (request, response) => {
  const {todoId} = request.params

  const getTodoQuery = `SELECT id, todo, priority, status, category, due_date AS dueDate FROM todo WHERE id = ${todoId};`

  const todoItem = await db.get(getTodoQuery)
  response.send(todoItem)
})

// API - 3 GET Todo List Using Due Date

app.get('/agenda/', checkRequestQueries, async (request, response) => {
  const {date} = request

  const selectDueDateQuery = `SELECT id, todo, priority, category, due_date AS dueDate FROM todo WHERE due_date = ${date};`

  const todoDateList = await db.all(selectDueDateQuery)

  if (todoDateList === undefined) {
    response.status(400)
    response.send('Invalid Due Date')
  } else {
    response.send(todoDateList)
  }
})

// API - 4 Add Todo Item

app.post('/todos/', checkRequestsBody, async (request, response) => {
  const {id, todo, category, priority, status, dueDate} = request

  const newTodoItemQuery = `INSERT INTO todo(id, todo, priority, status, category, due_date)
  VALUES(
    '${id}',
    '${todo}',
    '${priority}',
    '${status}',
    '${category}',
    '${dueDate}'
  );`

  await db.run(newTodoItemQuery)

  response.send('Todo Successfully Added')
})

// API - 5 Update Todo Item

app.put('/todos/:todoId', checkRequestsBody, async (request, response) => {
  const {todoId} = request.params

  const {todo, priority, status, category, dueDate} = request

  let updateTodoItem = null

  switch (true) {
    case status !== undefined:
      updateTodoItem = `UPDATE todo SET status = '${status}' WHERE id = ${todoId};`

      await db.run(updateTodoItem)

      response.send('Status Updated')

      break

    case priority !== undefined:
      updateTodoItem = `UPDATE todo SET priority = '${priority}' WHERE id = ${todoId};`

      await db.run(updateTodoItem)

      response.send('Priority Updated')

      break

    case category !== undefined:
      updateTodoItem = `UPDATE todo SET category = '${category}' WHERE id = ${todoId};`

      await db.run(updateTodoItem)

      response.send('Category Updated')

      break

    case todo !== undefined:
      updateTodoItem = `UPDATE todo SET todo = '${todo}' WHERE id = ${todoId};`

      await db.run(updateTodoItem)

      response.send('Todo Updated')

      break

    case dueDate !== undefined:
      updateTodoItem = `UPDATE todo SET due_date = '${dueDate}' WHERE id = ${dueDate};`

      await db.run(updateTodoItem)

      response.send('Due Date Updated')

      break
  }
})

// API - 6 Delete Todo Item

app.delete('/toods/:todoId/', async (request, response) => {
  const {todoId} = request.params

  const deleteTodoQuery = `DELETE FROM todo WHERE id = ${todoId};`

  await db.run(deleteTodoQuery)

  response.send('Todo deleted')
})

module.exports = app
