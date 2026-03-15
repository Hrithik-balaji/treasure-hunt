const mongoose = require('mongoose');
const Round = require('./models/Round');
require('dotenv').config();

const defaultRounds = [
  {
    roundNumber: 1,
    title: 'Technical Quiz',
    description: 'A 15-minute written screening round testing Python, networking, data structures, and logical thinking.',
    durationMinutes: 15,
    questions: [
      { text: 'What is the output of: print(2**3)?', type: 'text', correctAnswer: '8', points: 10, hint: 'The ** operator means "to the power of".', order: 1 },
      { text: 'Which protocol is used to transfer web pages?', type: 'mcq', options: ['FTP', 'HTTP', 'SMTP', 'TCP'], correctAnswer: 'HTTP', points: 10, hint: 'You see it at the start of every URL.', order: 2 },
      { text: 'Convert binary 1010 to decimal.', type: 'text', correctAnswer: '10', points: 10, hint: 'Each bit is a power of 2: 8+0+2+0.', order: 3 },
      { text: 'What does CPU stand for?', type: 'text', correctAnswer: 'Central Processing Unit', points: 10, hint: 'The "brain" of the computer.', order: 4 },
      { text: 'What is the file extension of a Python source file?', type: 'mcq', options: ['.pt', '.py', '.pyt', '.pyn'], correctAnswer: '.py', points: 10, order: 5 },
      { text: 'Which data structure operates on the FIFO (First In, First Out) principle?', type: 'mcq', options: ['Stack', 'Queue', 'Tree', 'Heap'], correctAnswer: 'Queue', points: 10, hint: 'Think of a ticket line.', order: 6 },
      { text: 'What is the output of: print(len("TECH"))?', type: 'text', correctAnswer: '4', points: 10, order: 7 },
      { text: 'What symbol is used to write a single-line comment in Python?', type: 'mcq', options: ['//', '/*', '#', '--'], correctAnswer: '#', points: 10, order: 8 },
      { text: 'What does HTML stand for?', type: 'text', correctAnswer: 'HyperText Markup Language', points: 10, order: 9 },
      { text: 'Identify the syntax error in: for i in range(5) print(i)', type: 'mcq', options: ['Wrong function name', 'Missing colon after range(5)', 'print needs brackets', 'No error'], correctAnswer: 'Missing colon after range(5)', points: 10, order: 10 },
      { text: 'What is the output of: print(type(3.14))?', type: 'mcq', options: ['<class \'int\'>', '<class \'float\'>', '<class \'str\'>', '<class \'double\'>'], correctAnswer: '<class \'float\'>', points: 10, order: 11 },
      { text: 'Which keyword is used to define a function in Python?', type: 'mcq', options: ['func', 'define', 'def', 'function'], correctAnswer: 'def', points: 10, order: 12 },
      { text: 'What is the value of: 7 % 3?', type: 'text', correctAnswer: '1', points: 10, order: 13 },
      { text: 'Which of these is a mutable data type in Python?', type: 'mcq', options: ['tuple', 'string', 'list', 'int'], correctAnswer: 'list', points: 10, order: 14 },
      { text: 'What does RAM stand for?', type: 'text', correctAnswer: 'Random Access Memory', points: 10, order: 15 },
    ],
  },
  {
    roundNumber: 2,
    title: 'Technical Clue Hunt',
    description: 'Decode sequential clues using binary, ciphers, debugging, and logic to unlock the next stage.',
    durationMinutes: 20,
    questions: [
      { text: 'Clue 1 – Decode the binary sequence:\n01001011  01000101  01011001', type: 'text', correctAnswer: 'KEY', points: 25, unlockDigit: 1, hint: 'K=75, E=69, Y=89.', order: 1 },
      { text: 'Clue 2 – Debug this Python code and state what is missing:\nif 5 > 3 print("Yes")', type: 'text', correctAnswer: 'Missing colon after condition', points: 25, unlockDigit: 2, hint: 'Python punctuation?', order: 2 },
      { text: 'Clue 3 – Caesar Cipher with Shift –3. Decode: FRGH', type: 'text', correctAnswer: 'CODE', points: 25, unlockDigit: 3, hint: 'Shift -3.', order: 3 },
      { text: 'Clue 4 – Logic Lock: Find the 3-digit number where:\n• Sum of digits = 12\n• Middle digit = 5\n• First digit is 1 more than the last digit', type: 'text', correctAnswer: '453', points: 25, unlockDigit: 4, hint: '(x+1)+5+x = 12.', order: 4 },
      { text: 'Clue 5 – What is the decimal value of the hexadecimal number 0x1F?', type: 'text', correctAnswer: '31', points: 20, unlockDigit: 5, hint: '1×16 + 15 = ?', order: 5 },
    ],
  },
  {
    roundNumber: 3,
    title: 'Final Master Challenge',
    description: 'Top teams compete for the Treasure Title with recursion, algorithm analysis, pattern recognition, and code ordering.',
    durationMinutes: 30,
    questions: [
      { text: 'Challenge 1 – Recursion Output:\nfun(n) = n + fun(n-1), base case fun(1) = 1\nWhat is the output of fun(4)?', type: 'text', correctAnswer: '10', points: 40, order: 1 },
      { text: 'Challenge 2 – Correct Order of Steps to Run a Program: A) Write code, B) Execute program, C) Debug errors, D) Compile', type: 'text', correctAnswer: 'ADCB', points: 30, order: 2 },
      { text: 'Challenge 3 – Find the missing number: 2, 6, 12, 20, 30, ?', type: 'text', correctAnswer: '42', points: 30, order: 3 },
      { text: 'Tie Breaker – What is the time complexity of Binary Search?', type: 'mcq', options: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'], correctAnswer: 'O(log n)', points: 20, order: 4 },
      { text: 'Bonus 1 – What is the space complexity of O(n) array?', type: 'mcq', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], correctAnswer: 'O(n)', points: 25, order: 5 },
      { text: 'Bonus 2 – def mystery(n): return n if n<=1 else mystery(n-1)+n. mystery(5)?', type: 'text', correctAnswer: '15', points: 35, order: 6 },
      { text: 'Bonus 3 – Best average-case complexity?', type: 'mcq', options: ['Bubble', 'Merge', 'Insertion', 'Selection'], correctAnswer: 'Merge Sort – O(n log n)', points: 30, order: 7 },
    ],
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    await Round.deleteMany({});
    await Round.insertMany(defaultRounds);
    console.log('Seeded rounds successfully (Pruned to 5 clues in RD2)!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
