// Required dependencies & setup
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const { NODE_ENV } = require('./config');
const uuid = require('uuid/v4');

const app = express();
const morganOption = NODE_ENV === 'production' ? 'tiny' : 'common';
app.use(morgan(morganOption));
app.use(cors());
app.use(helmet());
app.use(express.json());

// winston setup
const logger = winston.createLogger({
	level: 'info',
	format: winston.format.json(),
	transports: [new winston.transports.File({ filename: 'info.log' })]
});

if (NODE_ENV !== 'production') {
	logger.add(
		new winston.transports.Console({
			format: winston.format.simple()
		})
	);
}

// Trelloyes cards and lists
const cards = [
	{
		id: 1,
		title: 'Task One',
		content: 'This is card one'
	}
];
const lists = [
	{
		id: 1,
		header: 'List One',
		cardIds: [1]
	}
];

// API Token Authorization
app.use(function validateBearerToken(req, res, next) {
	const apiToken = process.env.API_TOKEN;
	const authToken = req.get('Authorization');

	if (!authToken || authToken.split(' ')[1] !== apiToken) {
		logger.error(`Unauthorized request to path: ${req.path}`);
		return res.status(401).json({ error: 'Unauthorized request' });
	}
	// move to the next middleware
	next();
});

// Server Endpoints
app.get('/', (req, res) => {
	res.send('Hello, trelloyes!');
});

app.get('/card', handleGetCards);

app.get('/card/:id', handleGetCardWithId);

app.post('/card', handlePostNewCard);

app.get('/list', handleGetLists);

app.get('/list/:id', handleGetListWithId);

// Server Functions

function handleGetCards(req, res) {
	res.json(cards);
}

function handleGetCardWithId(req, res) {
	const { id } = req.params;
	const card = cards.find(card => card.id == id);

	if (!card) {
		logger.error(`Card with id ${id} not found`);
		return res.status(404).send('Card Not Found');
	}

	res.json(card);
}

function handlePostNewCard(req, res) {
	const { title, content } = req.body;

	if (!title) {
		logger.error(`Title is required`);
		return res.status(400).send('Invalid data, card must have title');
	}

	if (!content) {
		logger.error(`Content is required`);
		return res.status(400).send('Invalid data, Card must have content');
	}

	const id = uuid();
	const newCard = {
		id,
		title,
		content
	};
	cards.push(newCard);

	logger.info(`Card with id ${id} created`);

	res.status(201)
		.location(`http://localhost:8000/card/${id}`)
		.json(newCard);
}

function handleGetLists(req, res) {
	res.json(lists);
}

function handleGetListWithId(req, res) {
	const { id } = req.params;
	const list = lists.find(list => list.id == id);

	if (!list) {
		logger.error(`List with id ${id} not found`);
		return res.status(404).send('List Not Found');
	}

	res.json(list);
}

// Error handling
app.use(function errorHandler(error, req, res, next) {
	let response;
	if (NODE_ENV === 'production') {
		response = { error: { message: 'server error' } };
	} else {
		console.error(error);
		response = { message: error.message, error };
	}
	res.status(500).json(response);
});

module.exports = app;
