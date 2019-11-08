const { expect } = require("chai");
const knex = require("knex");
const app = require("../src/app");
const { makeNotesArray } = require("./notes.fixtures");
const { makeFoldersArray } = require("./folders.fixtures");

describe("Notes Endpoint", function() {
  let db;

  before("make knex instance", () => {
    db = knex({
      client: "pg",
      connection: process.env.TEST_DB_URL
    });
    app.set("db", db);
  });

  after("disconnect from db", () => db.destroy());

  //  before("clean the table", () => db("notes").truncate());
  before("clean the table", () =>
    db.raw("TRUNCATE folders, notes RESTART IDENTITY CASCADE")
  );

  afterEach("cleanup", () =>
    db.raw("TRUNCATE folders, notes RESTART IDENTITY CASCADE")
  );

  /* ========= GET, POST /api/notes ========== */
  describe("GET /api/notes", () => {
    context("Given there are notes in the database", () => {
      const testNotes = makeNotesArray();
      const testFolders = makeFoldersArray();

      before("insert notes", () => {
        return db
          .into("folders")
          .insert(testFolders)
          .then(() => {
            return db.into("notes").insert(testNotes);
          });
      });

      it("GET /api/notes responds with 200 and all of the notes", () => {
        return supertest(app)
          .get("/api/notes")
          .expect(200, testNotes);
      });
    });
  });

  describe("POST /api/notes", () => {
    const testNotes = makeNotesArray();
    const testFolders = makeFoldersArray();

    before("insert notes", () => {
      return db.into("folders").insert(testFolders);
      //.then(() => {
      //  return db.into("notes").insert(testNotes);
      //});
    });
    it("creates a note, responding with 201 and the new note", function() {
      //this.retries(3);
      const newNote = {
        name: "New Note",
        content: "Lorisci autem neque?",
        modified: "1919-12-22T16:28:32.615Z",
        folder_id: 2
      };
      return supertest(app)
        .post("/api/notes")
        .send(newNote)
        .expect(201)
        .expect(res => {
          expect(res.body.name).to.eql(newNote.name);
          //expect(res.body.content).to.eql(newNote.content);
          expect(res.body).to.have.property("id");
          expect(res.headers.location).to.eql(`/api/notes/${res.body.id}`);
        })
        .then(postRes =>
          supertest(app)
            .get(`/api/notes/${postRes.body.id}`)
            .expect(postRes.body)
        );
    });
    /*
    it('responds with 400 and an error message when the "folder name" is missing', () => {
      const requiredFields = ["name"];

      requiredFields.forEach(field => {
        const newFolder = {
          name: "Test new folder"
        };
        delete newFolder[field];

        return supertest(app)
          .post("/api/notes")
          .send(newFolder)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          });
      });
    });*/
    ////HOW CAN I DISCONNECT SO IT STOPS HANGING??
  });

  /* ========= GET, POST, DELETE /api/notes:noteId ========== */
  describe("GET /api/notes/:note_id", () => {
    const testNotes = makeNotesArray();
    const testFolders = makeFoldersArray();

    before("insert notes", () => {
      return db
        .into("folders")
        .insert(testFolders)
        .then(() => {
          return db.into("notes").insert(testNotes);
        });
    });

    it("responds with 200 and the specified note", () => {
      const noteId = 2;
      const expectedNote = testNotes[noteId - 1];
      return supertest(app)
        .get(`/api/notes/${noteId}`)
        .expect(200);
    });
  });

  describe("DELETE /api/notes/:noteId", () => {
    context("Given there are notes in the database", () => {
      const testNotes = makeNotesArray();
      const testFolders = makeFoldersArray();

      beforeEach("insert notes", () => {
        return db
          .into("folders")
          .insert(testFolders)
          .then(() => {
            return db.into("notes").insert(testNotes);
          });
      });

      it("responds with a 204 and removes the note", () => {
        const idToRemove = 2;
        const expectedNotes = testNotes.filter(note => note.id !== idToRemove);
        return supertest(app)
          .delete(`/api/notes/${idToRemove}`)
          .expect(204)
          .then(res =>
            supertest(app)
              .get("/api/notes")
              .expect(expectedNotes)
          );
      });
    });
  });

  describe("PATCH /api/notes/:note_id", () => {
    context("Given there are folders in the database", () => {
      const testNotes = makeNotesArray();
      const testFolders = makeFoldersArray();

      beforeEach("insert notes", () => {
        return db
          .into("folders")
          .insert(testFolders)
          .then(() => {
            return db.into("notes").insert(testNotes);
          });
      });

      it("responds with 204 and updates the note", () => {
        const idToUpdate = 2;
        const updateNote = {
          name: "Updated Name"
        };
        const expectedNote = {
          ...testNotes[idToUpdate - 1],
          ...updateNote
        };
        return supertest(app)
          .patch(`/api/notes/${idToUpdate}`)
          .send(updateNote)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/notes/${idToUpdate}`)
              .expect(expectedNote)
          );
      });

      it("responds with 400 when no required fields supplied", () => {
        const idToUpdate = 2;
        return supertest(app)
          .patch(`/api/notes/${idToUpdate}`)
          .send({ irrelevantField: "foo" })
          .expect(400, {
            error: {
              message:
                "Request body must contain a 'name', 'content', 'folderId'."
            }
          });
      });

      it("responds with 204 when updating only a subset of fields", () => {
        const idToUpdate = 2;
        const updateNote = {
          name: "updated Folder Title"
        };
        const expectedNote = {
          ...testNotes[idToUpdate - 1],
          ...updateNote
        };
        return supertest(app)
          .patch(`/api/notes/${idToUpdate}`)
          .send({
            ...updateNote,
            fieldToIgnore: "should not be in GET response"
          })
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/notes/${idToUpdate}`)
              .expect(expectedNote)
          );
      });
    });
  });

  /* ========= GET, DELETE / GIVEN AN EMPTY DATABASE ========== */
  describe("GET /api/notes", () => {
    context("Given no notes", () => {
      it("responds with 200 and an empty list", () => {
        return supertest(app)
          .get("/api/notes")
          .expect(200, []);
      });
    });
  });
  describe("GET /api/notes/:noteId", () => {
    context("Given no notes", () => {
      it("responds with 404", () => {
        const noteId = 435;
        return supertest(app)
          .get(`/api/notes/${noteId}`)
          .expect(404, { error: { message: `Note doesn't exist` } });
      });
    });
  });

  describe("DELETE /api/notes/:noteId", () => {
    context("Given no notes", () => {
      it("responds with 404", () => {
        const noteId = 456;
        return supertest(app)
          .delete(`/api/notes/${noteId}`)
          .expect(404, { error: { message: `Note doesn't exist` } });
      });
    });
  });

  describe("PATCH /api/notes/:noteId", () => {
    context("Given no notes", () => {
      it("responds with 404", () => {
        const noteId = 456;
        return supertest(app)
          .patch(`/api/notes/${noteId}`)
          .expect(404, { error: { message: `Note doesn't exist` } });
      });
    });
  });
});
