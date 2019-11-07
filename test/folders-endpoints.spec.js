const { expect } = require("chai");
const knex = require("knex");
const app = require("../src/app");
const { makeFoldersArray } = require("./folders.fixtures");

describe("Folders Endpoint", function() {
  let db;

  before("make knex instance", () => {
    db = knex({
      client: "pg",
      connection: process.env.TEST_DB_URL
    });
    app.set("db", db);
  });

  after("disconnect from db", () => db.destroy());

  //  before("clean the table", () => db("folders").truncate());
  before("clean the table", () =>
    db.raw("TRUNCATE folders, notes RESTART IDENTITY CASCADE")
  );

  afterEach("cleanup", () =>
    db.raw("TRUNCATE folders, notes RESTART IDENTITY CASCADE")
  );

  /* ========= GET, POST /api/folders ========== */
  describe("GET /api/folders", () => {
    context("Given there are folders in the database", () => {
      const testFolders = makeFoldersArray();

      beforeEach("insert folders", () => {
        return db.into("folders").insert(testFolders);
      });

      it("GET /folders responds with 200 and all of the folders", () => {
        return supertest(app)
          .get("/api/folders")
          .expect(200);
      });
    });
  });

  describe("POST /api/folders", () => {
    it("creates a folder, responding with 201 and the new folder", function() {
      this.retries(3);
      const newFolder = {
        name: "Test new folder"
      };
      return supertest(app)
        .post("/api/folders/")
        .send(newFolder)
        .expect(201)
        .expect(res => {
          expect(res.body.name).to.eql(newFolder.name);
          expect(res.body).to.have.property("id");
          expect(res.headers.location).to.eql(`/api/folders/${res.body.id}`);
        })
        .then(postRes =>
          supertest(app)
            .get(`/api/folders/${postRes.body.id}`)
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
          .post("/api/folders")
          .send(newFolder)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          });
      });
    });*/
    ////HOW CAN I DISCONNECT SO IT STOPS HANGING??
  });

  /* ========= GET, POST, DELETE /api/folders:folder_id ========== */
  describe("GET /api/folders/:folderId", () => {
    const testFolders = makeFoldersArray();

    beforeEach("insert folders", () => {
      return db.into("folders").insert(testFolders);
    });

    it("responds with 200 and the specified folder", () => {
      const folderId = 2;
      const expectedFolder = testFolders[folderId - 1];
      return supertest(app)
        .get(`/api/folders/${folderId}`)
        .expect(200, expectedFolder);
    });
  });

  describe("DELETE /api/folders/:folderId", () => {
    context("Given there are folders in the database", () => {
      const testFolders = makeFoldersArray();

      before("insert articles", () => {
        return db.into("folders").insert(testFolders);
      });

      it("responds with a 204 and removes the folder", () => {
        const idToRemove = 2;
        const expectedFolders = testFolders.filter(
          folder => folder.id !== idToRemove
        );
        return supertest(app)
          .delete(`/api/folders/${idToRemove}`)
          .expect(204)
          .then(res =>
            supertest(app)
              .get("/api/folders")
              .expect(expectedFolders)
          );
      });
    });
  });

  describe("PATCH /api/folders/:folderId", () => {
    context("Given there are folders in the database", () => {
      const testFolders = makeFoldersArray();

      beforeEach("insert folders", () => {
        return db.into("folders").insert(testFolders);
      });

      it("responds with 204 and updates the folder", () => {
        const idToUpdate = 2;
        const updateFolder = {
          name: "Updated Name"
        };
        const expectedFolder = {
          ...testFolders[idToUpdate - 1],
          ...updateFolder
        };
        return supertest(app)
          .patch(`/api/folders/${idToUpdate}`)
          .send(updateFolder)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/folders/${idToUpdate}`)
              .expect(expectedFolder)
          );
      });

      it("responds with 400 when no required fields supplied", () => {
        const idToUpdate = 2;
        return supertest(app)
          .patch(`/api/folders/${idToUpdate}`)
          .send({ irrelevantField: "foo" })
          .expect(400, {
            error: {
              message: "Request body must contain a 'name."
            }
          });
      });

      it("responds with 204 when updating only a subset of fields", () => {
        const idToUpdate = 2;
        const updateFolder = {
          name: "updated Folder Title"
        };
        const expectedFolder = {
          ...testFolders[idToUpdate - 1],
          ...updateFolder
        };
        return supertest(app)
          .patch(`/api/folders/${idToUpdate}`)
          .send({
            ...updateFolder,
            fieldToIgnore: "should not be in GET response"
          })
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/folders/${idToUpdate}`)
              .expect(expectedFolder)
          );
      });
    });
  });

  /* ========= GET, DELETE / GIVEN AN EMPTY DATABASE ========== */
  describe("GET /api/folders", () => {
    context("Given no folders", () => {
      it("responds with 200 and an empty list", () => {
        return supertest(app)
          .get("/api/folders")
          .expect(200, []);
      });
    });
  });
  describe("GET /api/folders/:folderId", () => {
    context("Given no folders", () => {
      it("responds with 404", () => {
        const folderId = 435;
        return supertest(app)
          .get(`/api/folders/${folderId}`)
          .expect(404, { error: { message: `Folder doesn't exist` } });
      });
    });
  });

  describe("DELETE /api/folders/:folderId", () => {
    context("Given no folders", () => {
      it("responds with 404", () => {
        const folderId = 456;
        return supertest(app)
          .delete(`/api/folders/${folderId}`)
          .expect(404, { error: { message: `Folder doesn't exist` } });
      });
    });
  });

  describe("PATCH /api/folders/:folderId", () => {
    context("Given no folders", () => {
      it("responds with 404", () => {
        const folderId = 456;
        return supertest(app)
          .patch(`/api/folders/${folderId}`)
          .expect(404, { error: { message: `Folder doesn't exist` } });
      });
    });
  });
});
