import {Request, Response} from "express";
import db from "../db";

export const getUsers = (req:Request, res:Response) => {
    try {
        const users = db.prepare("SELECT * FROM users").all();
        res.json(users);
    } catch(error) {
        console.log(error);
        res.status(500).json({error:"Internal Server Error"})
    }
}

export const createUser = (req:Request, res:Response) => {
    const {name, email} = req.body;
    const stmt = db.prepare("INSERT INTO users (name,email) VALUES (?,?)");
    try{
        const info = stmt.run(name,email);
        res.json({id: info.lastInsertRowid, name, email});
    } catch (error) {
        res.status(400).json({error:"Email already in use."});
    }
}


export const uploadPicture = (req: Request, res: Response): void => {
  const file = req.file;

  if (!file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  // Full path where the file is saved
  const filePath = file.path;

  console.log("Uploaded file:", file.filename);

  res.json({
    message: "File uploaded successfully",
    filename: file.filename,
    url: `/uploads/${file.filename}`,
  });
};
