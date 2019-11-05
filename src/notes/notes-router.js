const path = require("path");
const express = require("express");
const xss = require("xss");
const NotesService = require("./notes-service");

const NotesRouter = express.Router();
const jsonParser = express.json();

const sanitizeNotes = note => ({
  id: note.id,
  name: xss(note.name),
  content: xss(note.content),
  modified: note.modified,
  folderId: note.folderId
});

NotesRouter.route("/")
  .get((req, res, next) => {
    const knexInstance = req.app.get("db");
    NotesService.getAllNotes(knexInstance)
      .then(notes => {
        res.json(notes);
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const { name, content, folderId } = req.body;
    const newNote = { name, folderId };

    /* === repeating info ===========
    if (!title) {
      return res.status(400).json({
        error: { message: `Missing 'title' in request body` }
      });
    }

    if (!content) {
      return res.status(400).json({
        error: { message: `Missing 'content' in request body` }
      });
    }
    =============================== */

    for (const [key, value] of Object.entries(newNote)) {
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        });
      }
    }

    NotesService.insertNote(req.app.get("db"), newNote)

      .then(note => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl + `/${noteId}`));
        res.json(sanitizeArticle(note));

        /* ======= Repeating code ========
        res.json({
          id: article.id,
          style: article.style,
          title: xss(article.title), //sanitize title
          content: xss(article.content), //sanitize content
          date_published: article.date_published
        });
        ================================== */
      })
      .catch(next);
  });

NotesRouter.route("/:noteId")
  .all((req, res, next) => {
    const knexInstance = req.app.get("db");
    NotesService.getById(knexInstance, req.params.noteId)
      .then(note => {
        if (!note) {
          return res.status(404).json({
            error: { message: `Note doesn't exist` }
          });
        }
        res.note = note; //save the notefor the next middleware
        next(); // don't forget to call next so the next middleware happens!
      })
      .catch(next);
  })
  .get((req, res, next) => {
    res.json(sanitizeNotes(res.note));
    /* ========= included in .all now =========
    const knexInstance = req.app.get("db");

    ArticlesService.getById(knexInstance, req.params.article_id)
      .then(article => {
        if (!article) {
          return res.status(404).json({
            error: { message: `Article doesn't exist` }
          });
        }
        //      res.json(article);
        res.json(sanitizeArticle(article)); */

    /* ======= Repeating code ========
      res.json({
        id: article.id,
        style: article.style,
        title: xss(article.title), //sanitize title
        content: xss(article.content), //sanitize content
        date_published: article.date_published
      });
      ================================== */

    /* ---contin.. included in .all now ---
      })
      .catch(next);
      --------------------*/
  })
  .delete((req, res, next) => {
    //res.status(204).end()
    const knexInstance = req.app.get("db");
    NotesService.deleteNote(knexInstance, req.params.noteId)
      .then(() => {
        res.status(204).end();
      })
      .catch(next);
  })
  .patch(jsonParser, (req, res, next) => {
    const { name, content, modified, folderId } = req.body;
    const noteToUpdate = { name, content, modified, folderId };

    const numberOfValues = Object.values(noteToUpdate).filter(Boolean).length;
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message: "Request body must contain a 'name', 'content', 'folderId'."
        }
      });
    }

    NotessService.updateNote(req.app.get("db"), req.params.noteId, noteToUpdate)
      .then(numRowsAffected => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = NotesRouter;
