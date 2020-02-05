'use strict';

const fs = require('fs');
const readline = require('readline');

// Abstract factory

class DataAccessLayer {
  constructor() {
    const proto = Object.getPrototypeOf(this);
    if (proto === DataAccessLayer) {
      throw new Error('abstract class should not be instanciated');
    }
  }

  createDatabase() {
    throw new Error('abstract class should not be instanciated');
  }

  createCursor() {
    throw new Error('abstract class should not be instanciated');
  }
}

// File storage factory

class FsDataAccess {
  createDatabase(...args) {
    return new FileStorage(this, ...args);
  }

  createCursor(...args) {
    return new FileLineCursor(this, ...args);
  }
}

// Abstract database

class Database {
  constructor(dal) {
    const proto = Object.getPrototypeOf(this);
    if (proto === Database) {
      throw new Error('abstract class should not be instanciated');
    }
    this.dal = dal;
  }

  select() {
    throw new Error('select method is not implemented');
  }
}

class Cursor {
  constructor(dal) {
    const proto = Object.getPrototypeOf(this);
    if (proto === Cursor) {
      throw new Error('abstract class should not be instanciated');
    }
    this.dal = dal;
    this.current = 0;
  }

  [Symbol.asyncIterator]() {
    throw new Error('iterator is not implemented');
  }
}

class FileLineCursor extends Cursor {
  constructor(dal, fileStorage, query) {
    super(dal);
    this.query = query;
    this.lines = readline.createInterface({
      input: fileStorage.fileStream,
      crlfDelay: Infinity,
    })[Symbol.asyncIterator]();
  }

  [Symbol.asyncIterator]() {
    const cursor = this;
    return ({
      async next() {
        do {
          const { value, done } = await cursor.lines.next();
          if (done) return { done: true };
          cursor.current++;
          const data = JSON.parse(value);
          let condition = true;
          const { query } = cursor;
          for (const field in query) {
            condition = condition && data[field] === query[field];
          }
          if (condition) return { value: data, done: false };
        } while (true);
      }
    });
  }
}

class FileStorage extends Database {
  constructor(dal, fileName) {
    super(dal);
    this.fileName = fileName;
    this.fileStream = fs.createReadStream(fileName);
  }

  select(query) {
    const { dal } = this;
    return dal.createCursor(this, query);
  }
}

// Usage

(async () => {
  const dal = new FsDataAccess();
  const db = dal.createDatabase('./storage.dat');
  const cursor = db.select({ city: 'Roma' });
  for await (const record of cursor) {
    console.dir(record);
  }
})();
