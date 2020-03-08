import * as crypto from 'crypto';

const numberOfIterations = 100000;

type password = {
  value: string
  salt: string
}

const generateRandomString = (length = 64) => {
  const string = crypto.randomBytes(length).toString('hex').slice(0, length);

  return string;
};

const generateHashedPasswordWithSalt = (password: string, salt: string): password => {
  const hash = crypto.pbkdf2Sync(password, salt, numberOfIterations, 256, 'sha512').toString('hex');
  
  return {
    value: hash,
    salt,
  };
}

const generateHashedPassword = (password: string): password => {
  const salt = generateRandomString();
  return generateHashedPasswordWithSalt(password, salt);
}

const verifyHashedPassword = (plainPassword: string, hashedPassword: password): boolean => {
  const hashedInputPassword = generateHashedPasswordWithSalt(plainPassword, hashedPassword.salt);

  return crypto.timingSafeEqual(
    Buffer.from(hashedInputPassword.value),
    Buffer.from(hashedPassword.value),
  );
};

export { 
  generateRandomString,
  generateHashedPassword,
  verifyHashedPassword,
};
