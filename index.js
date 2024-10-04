require('dotenv').config();

const express = require('express');
const venom = require('venom-bot');
const axios = require('axios');

const app = express();
const port = 3000;

let venomClient;
let messageQueue = [];

const incomingMessageUrl = process.env.NODE_ENV === 'production' 
  ? 'https://cgdesarrollos.mx/save-message' 
  : 'https://cgdesarrollos.mx/save-message';

// Middleware to parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create a session when the server starts
venom
  .create({
    session: 'session-name', //name of session
  })
  .then((client) => {
    venomClient = client;
    console.log('Venom session started');
    startListening(client);
    processQueue(); // Process any queued messages
  })
  .catch((erro) => {
    console.log('Error starting Venom session: ', erro);
  });

// Function to listen to incoming WhatsApp messages
function startListening(client) {
  client.onMessage((message) => {
    console.log('Message received: ', message.body);

    // Send a POST request with the message to another server
    const data = {
      from: message.from,
      body: message.body,
      timestamp: message.timestamp,
      isGroupMsg: message.isGroupMsg,
    };

    axios
      .post(incomingMessageUrl, data)
      .then((response) => {
        console.log('Message posted to the server:', response.data);
      })
      .catch((error) => {
        console.error('Error posting message to the server:', error);
      });

    // Auto-reply to "Hola"
    if (message.body === 'Hola' && !message.isGroupMsg) {
      client
        .sendText(message.from, 'Gracias por escribir a CGDesarrollos 👷')
        .then((result) => {
          console.log('Message sent successfully.');
        })
        .catch((erro) => {
          console.error('Error sending message: ', erro);
        });
    }
  });
}

// Function to process queued messages
function processQueue() {
  while (messageQueue.length > 0) {
    const { to, message, res } = messageQueue.shift();
    sendMessage(to, message, res);
  }
}

// Function to send a text message
function sendMessage(to, message, res) {
  venomClient
    .sendText(to, message)
    .then((result) => {
      res.status(200).json({
        status: 'success',
        data: result
      });
    })
    .catch((erro) => {
      res.status(500).json({
        status: 'error',
        message: erro.toString()
      });
    });
}

// Function to send an image
function sendImage(to, imageUrl, caption, res) {
  venomClient
    .sendImage(to, imageUrl, 'image', caption)
    .then((result) => {
      res.status(200).json({
        status: 'success',
        data: result
      });
    })
    .catch((erro) => {
      res.status(500).json({
        status: 'error',
        message: erro.toString()
      });
    });
}

// Function to send a location
function sendLocation(to, latitude, longitude, title, res) {
  venomClient
    .sendLocation(to, latitude, longitude, title)
    .then((result) => {
      res.status(200).json({
        status: 'success',
        data: result
      });
    })
    .catch((erro) => {
      res.status(500).json({
        status: 'error',
        message: erro.toString()
      });
    });
}

// Function to send a file
function sendFile(to, filePath, fileName, caption, res) {
  venomClient
    .sendFile(to, filePath, fileName, caption)
    .then((result) => {
      res.status(200).json({
        status: 'success',
        data: result
      });
    })
    .catch((erro) => {
      res.status(500).json({
        status: 'error',
        message: erro.toString()
      });
    });
}

// API route to send a WhatsApp message using POST
app.post('/send-message', (req, res) => {
  const { to, message } = req.body;
  console.log('Received status: ', req.body.status);
  console.log('Received body: ', req.body);
  if (venomClient) {
    sendMessage(to, message, res);
  } else {
    messageQueue.push({ to, message, res });
    res.status(202).json({
      status: 'queued',
      message: 'Venom client not initialized, message queued'
    });
  }
});

// API route to send an image using POST
app.post('/send-image', (req, res) => {
  const { to, imageUrl, caption } = req.body;
  if (venomClient) {
    sendImage(to, imageUrl, caption, res);
  } else {
    res.status(500).json({
      status: 'error',
      message: 'Venom client not initialized'
    });
  }
});

// API route to send a location using POST
app.post('/send-location', (req, res) => {
  const { to, latitude, longitude, title} = req.body;
  if (venomClient) {
    sendLocation(to, latitude, longitude, title, res);
  } else {
    res.status(500).json({
      status: 'error',
      message: 'Venom client not initialized'
    });
  }
});

// API route to send a file using POST
app.post('/send-file', (req, res) => {
  const { to, filePath, fileName, caption } = req.body;
  if (venomClient) {
    sendFile(to, filePath, fileName, caption, res);
  } else {
    res.status(500).json({
      status: 'error',
      message: 'Venom client not initialized'
    });
  }
});

// API route to check the status using GET
app.get('/status', (req, res) => {
  if (venomClient) {
    res.status(200).json({
      status: 'success',
      message: 'Venom client is active',
    });
  } else {
    res.status(500).json({
      status: 'error',
      message: 'Venom client not initialized',
    });
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
