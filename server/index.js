const express = require("express");
const app = express();
const PORT = 4000;
const mongoose = require("mongoose");
const config = require("./config/key");
const { auth } = require("./middleware/auth");
const { User } = require("./models/user");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");

app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());
app.use(cookieParser());

mongoose
  .connect(config.mongoURI)
  .then(() => console.log("MongoDB Connected..."))
  .catch((err) => console.log(err));

app.get("/", (req, res) => res.send("Hello"));

app.post("/register", async (req, res) => {
  const user = new User(req.body);
  try {
    await user.save();
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.json({ success: false, err });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.json({
      loginSuccess: false,
      message: "제공된 이메일에 해당하는 유저가 없습니다.",
    });
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.jsom({
      loginSuccess: false,
      message: "비밀번호가 일치하지 않습니다.",
    });
  }

  try {
    const token = await User.generateToken(user);
    user.token = token;
    user.save();
    return res.status(200).cookie("x_auth", user.token).json({
      loginSuccess: true,
      userId: user._id,
      message: "로그인 성공",
    });
  } catch (err) {
    return res.status(400).json({
      loginSuccess: false,
      message: "토큰 생성 실패",
    });
  }
});

app.get("/api/users/auth", auth, (req, res) => {
  const { _id, role, email, name, image } = req.user;
  res.status(200).json({
    _id,
    isAdmin: role === 0 ? false : true,
    isAuth: true,
    email,
    name,
    role,
    image,
  });
});

app.get("/api/users/logout", auth, async (req, res) => {
  try {
    await User.findOneAndUpdate({ _id: req.user._id }, { token: "" });
    return res.status(200).send({
      success: true,
    });
  } catch (err) {
    return res.json({ success: false, err });
  }
});

app.listen(PORT, () => console.log(`You are listening to ${PORT}`));
