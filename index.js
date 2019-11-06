const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const graphql = require('graphql');
const expressGraphQL = require('express-graphql');

const app = express();
const database = new sqlite3.Database("./my.db");

// Creating a db in sqlite3
const createContactTable = () => {
    const query = `CREATE TABLE IF NOT EXISTS contacts (
        id integer PRIMARY KEY,
        firstName text,
        lastName text,
        email text UNIQUE)`;
    return database.run(query);
}
createContactTable();

// Creating a custom graphql type that corresponds to a contact in the db
const contactType = new graphql.GraphQLObjectType({
    name: "Contact",
    fields: {
        id: { type: graphql.GraphQLID },
        firstName: { type: graphql.GraphQLString },
        lastName: { type: graphql.GraphQLString },
        email: { type: graphql.GraphQLString }
    }
});

// Creating a custom graphql query for fetching data from the db
let queryType = new graphql.GraphQLObjectType({
    name: "Query",
    fields: {
        type: graphql.GraphQLList(contactType),
        resolve: (root, args, context, info) => {
            return new Promise((resolve, reject) => {
                database.all("SELECT * FROM contacts;", function (err, rows) {
                    if (err) {
                        reject([]);
                    }
                    resolve(rows);
                });
            });
        }
    },
    contact: {
        type: contactType,
        args: {
            id: {
                type: new graphql.GraphQLNonNull(graphql.GraphQLID)
            }
        },
        resolve: (root, { id }, context, info) => {
            return new Promise((resolve, reject) => {
                database.all("SELECT * FROM contacts where id = (?);", [id], function (err, rows) {
                    if (err) {
                        reject(null);
                    }
                    resolve(rows[0]);
                });
            });
        }
    }
});

// Create a mutation type that corresponds to the create, update and delete operations
let mutationType = new graphql.GraphQLObjectType({
    name: "Mutation",
    fields: {
        createContact: {
            type: contactType,
            args: {
                firstName: {
                    type: new graphql.GraphQLNonNull(graphql.GraphQLString)
                },
                lastName: {
                    type: new graphql.GraphQLNonNull(graphql.GraphQLString)
                },
                email: {
                    type: new graphql.GraphQLNonNull(graphql.GraphQLString)
                }
            },
            resolve: (root, { firstName, lastName, email }) => {
                return new Promise((resolve, reject) => {
                    database.run("INSERT INTO contacts (firstName, lastName, email) VALUES (? ? ?);", [firstName, lastName, email], (err) => {
                        if (err) {
                            reject(null);
                        }
                        database.get("SELECT last_insert_row_id() as id", (err, row) => {
                            resolve({
                                id: row["id"],
                                firstName: firstName,
                                lastName: lastName,
                                email: email
                            });
                        });
                    });
                });
            }
        },
        updateContact: {
            type: graphql.GraphQLString,
            args: {
                id: {
                    type: new graphql.GraphQLNonNull(graphql.GraphQLID)
                },
                firstName: {
                    type: new graphql.GraphQLNonNull(graphql.GraphQLString)
                },
                lastName: {
                    type: new graphql.GraphQLNonNull(graphql.GraphQLString)
                },
                email: {
                    type: new graphql.GraphQLNonNull(graphql.GraphQLString)
                }
            },
            resolve: (root, { id, firstName, lastName, email }) => {
                return new Promise((resolve, reject) => {
                    database.run("UPDATE contacts SET firstName = (?), lastName = (?), email = (?) WHERE id = (?);", [firstName, lastName, email, id], (err) => {
                        if (err) {
                            reject(err);
                        }
                        resolve(`Contact #${id} updated`);
                    });
                });
            }
        }

    }
});