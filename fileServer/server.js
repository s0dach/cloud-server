const express = require("express");
const Multer = require("multer");
const cors = require("cors");
const { google } = require("googleapis");
const fs = require("fs");
const { default: axios } = require("axios");

const app = express();

app.use(cors());
app.use(express.static("public"));

const multer = Multer({
  storage: Multer.diskStorage({
    destination: function (req, file, callback) {
      callback(null, `public`);
    },
    filename: function (req, file, callback) {
      callback(
        null,
        file.fieldname + "_" + Date.now() + "_" + file.originalname
      );
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const authenticateGoogle = async () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: "service-account-key-file.json",
    scopes: "https://www.googleapis.com/auth/drive",
  });
  return auth;
};

const uploadToGoogleDrive = async (file, auth) => {
  const fileMetadata = {
    name: file.originalname,
    parents: ["1BYMxhXslZOHNxtzgjid9N6ELlWdYSDIm"],
  };

  const media = {
    mimeType: file.mimetype,
    body: fs.createReadStream(file.path),
  };

  const driveService = google.drive({ version: "v3", auth });

  const response = await driveService.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id",
  });
  return response;
};

app.post(
  "/upload-file-to-google-drive",
  multer.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).send("No file uploaded.");
        return;
      }
      const auth = await authenticateGoogle();
      const response = await uploadToGoogleDrive(req.file, auth);
      deleteFile(req.file.path);
      console.log("response", response);

      setTimeout(() => {
        axios.patch(
          `http://95.163.234.208:7000/api/lection/updatematerial/${req.body.data}`,
          {
            documentId: response.data.id,
            _id: req.body.data,
          }
        );
      }, "3000");
      console.log(response);

      res.status(200).json({ response });
    } catch (err) {
      console.log(err);
    }
  }
);

const deleteFile = (filePath) => {
  fs.unlink(filePath, () => {
    console.log("file deleted");
  });
};

app.listen(8000, () => {
  console.log("server start, port 8000");
});
