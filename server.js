const SocketServer = require('websocket').server

const http = require('http')

const server = http.createServer((req, res) => {})

wsServer = new SocketServer({httpServer:server})

const connections = []

wsServer.on('request', (req) => {
    const connection = req.accept()
    console.log('New Connection')
    connections.push(connection)
    connection.on('message', (mes) => {
        connections.forEach(element => {
            if (element != connection)
                element.sendUTF(mes.utf8Data)
        })
    })
    connection.on('close', (resCode, des) => {
        console.log('Connection Closed!')
        connections.splice(connections.indexOf(connection), 1)
    })
})

server.listen(3000, () => {
    console.log("RESTFUL APIt running on port 3000")
})