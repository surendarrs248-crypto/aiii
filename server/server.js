import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { OpenAI } from 'openai';
import { searchData } from './searchData.js';
import { getWeather, performWebSearch, getWikipediaSummary, getNews, getGeeksForGeeksInfo, getWikipediaInfo, getMusicTracks } from './apiIntegrations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 4000);

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

app.use(cors());
app.use(express.json());

function scoreResult(item, query, filters) {
  const queryWords = query.toLowerCase().split(/\W+/).filter(Boolean);
  const title = item.title.toLowerCase();
  const description = item.description.toLowerCase();
  const content = item.content.toLowerCase();
  const fullText = `${title} ${description} ${content}`;

  let score = 0;

  // Title matches get higher weight
  queryWords.forEach(word => {
    if (title.includes(word)) score += 25;
    else if (description.includes(word)) score += 15;
    else if (content.includes(word)) score += 10;
  });

  // Exact phrase matching
  if (fullText.includes(query.toLowerCase())) score += 20;

  // Word frequency bonus
  const wordCount = queryWords.reduce((count, word) => count + (fullText.split(word).length - 1), 0);
  score += Math.min(wordCount * 5, 50);

  // Base scores
  score += item.rating * 10;
  score += item.relevance;

  // Filter bonuses
  if (filters.category && filters.category !== 'All') {
    score += item.category === filters.category ? 30 : -15;
  }
  if (filters.tag && filters.tag !== 'All') {
    score += item.tags.includes(filters.tag) ? 20 : -10;
  }

  // Length normalization (prefer concise but relevant results)
  score += Math.max(0, 100 - fullText.length / 10);

  return Math.max(score, 0);
}

function applyFilters(items, filters) {
  return items.filter((item) => {
    if (filters.category && filters.category !== 'All' && item.category !== filters.category) {
      return false;
    }
    if (filters.tag && filters.tag !== 'All' && !item.tags.includes(filters.tag)) {
      return false;
    }
    return true;
  });
}

function performSearch(query, filters) {
  const matches = applyFilters(searchData, filters).map((item) => ({
    ...item,
    score: scoreResult(item, query, filters)
  }));
  return matches
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      snippet: item.snippet,
      source: item.source,
      category: item.category,
      tags: item.tags,
      rating: item.rating,
      relevance: item.relevance,
      confidence: Math.min(95, Math.max(62, Math.round(item.score * 0.45))),
      url: item.url,
      score: item.score
    }));
}

function extractCodeFromResponse(text) {
  if (!text) return { answer: '', codeSnippet: '' };
  const fenced = text.match(/```(?:[a-zA-Z]*)\n([\s\S]*?)```/);
  if (fenced) {
    return {
      answer: text.replace(fenced[0], '').trim() || 'See the generated code below.',
      codeSnippet: fenced[1].trim()
    };
  }
  return { answer: text.trim(), codeSnippet: '' };
}

function isCodeSnippet(text) {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.includes('```')) return true;
  if (trimmed.split('\n').length > 1 && /[{};=#<>]/.test(trimmed)) return true;
  return /(^\s*(def |class |function |const |let |var |import |package |public |private |interface |if |for |while |switch |return |print\(|console\.log\(|fetch\(|async ))/m.test(trimmed);
}

function generateLocalCode(query) {
  const lower = query.toLowerCase();
  if (lower === 'code' || lower.includes('code example') || lower.includes('sample code')) {
    return `// Example: Simple JavaScript function
function greetUser(name) { // Define a function named greetUser that takes a name parameter
  return \`Hello, \${name}! Welcome to our AI search engine.\`; // Return a template string with the name interpolated
}

// Usage
console.log(greetUser('Developer')); // Call the function and log the result to the console`;
  }
  if (/(c\+\+|cpp)/i.test(lower)) {
    return `// C++: Object-Oriented Programming with Modern C++ Features
// W3Schools C++ Tutorial: https://www.w3schools.com/cpp/
// This example demonstrates C++ OOP concepts, smart pointers, and standard library usage

#include <iostream>  // Include iostream for input/output operations (W3Schools: C++ User Input)
#include <string>    // Include string for string manipulation (W3Schools: C++ Strings)
#include <vector>    // Include vector for dynamic arrays (W3Schools: C++ Vectors)
#include <memory>    // Include memory for smart pointers (W3Schools: C++ Smart Pointers)
#include <algorithm> // Include algorithm for standard algorithms

// Class definition - blueprint for creating objects (W3Schools: C++ Classes)
class Person {  // Class declaration
private:  // Private access specifier - accessible only within class
    std::string name;  // Private member variable for name
    int age;          // Private member variable for age

public:  // Public access specifier - accessible from outside
    // Constructor - initializes object state (W3Schools: C++ Constructors)
    Person(std::string n, int a) : name(n), age(a) {  // Member initializer list
        std::cout << "Person created: " << name << std::endl;  // Constructor body
    }

    // Destructor - cleans up resources (W3Schools: C++ Destructors)
    ~Person() {  // Destructor definition
        std::cout << "Person destroyed: " << name << std::endl;  // Cleanup code
    }

    // Public member function - displays person info
    void display() const {  // Const member function - doesn't modify object
        std::cout << "Name: " << name << ", Age: " << age << std::endl;  // Output to console
    }

    // Getter method - provides controlled access to private data
    std::string getName() const { return name; }  // Return name (const)
    int getAge() const { return age; }           // Return age (const)

    // Setter method - allows controlled modification of private data
    void setAge(int a) {  // Setter with validation
        if (a >= 0 && a <= 150) {  // Validate age range
            age = a;  // Set age if valid
        } else {
            std::cout << "Invalid age!" << std::endl;  // Error message
        }
    }
};

// Derived class - inheritance from Person (W3Schools: C++ Inheritance)
class Employee : public Person {  // Public inheritance
private:
    std::string department;  // Additional private member
    double salary;          // Employee salary

public:
    // Constructor calling base class constructor (W3Schools: C++ Inheritance)
    Employee(std::string n, int a, std::string dept, double sal)
        : Person(n, a), department(dept), salary(sal) {}  // Initialize base and derived

    // Override display method - polymorphism (W3Schools: C++ Polymorphism)
    void display() const override {  // Override keyword for clarity
        Person::display();  // Call base class method
        std::cout << "Department: " << department  // Display department
                  << ", Salary: $" << salary << std::endl;  // Display salary
    }

    // Method specific to Employee
    void giveRaise(double percentage) {  // Method to increase salary
        if (percentage > 0) {  // Validate percentage
            salary *= (1 + percentage / 100);  // Calculate new salary
            std::cout << "Salary increased by " << percentage << "%" << std::endl;
        }
    }
};

// Template function - generic programming (W3Schools: C++ Templates)
template <typename T>  // Template parameter
T findMax(const std::vector<T>& vec) {  // Function template
    if (vec.empty()) {  // Check if vector is empty
        throw std::runtime_error("Vector is empty");  // Throw exception
    }
    T maxVal = vec[0];  // Initialize max with first element
    for (const auto& val : vec) {  // Range-based for loop (W3Schools: C++ For Loop)
        if (val > maxVal) {  // Compare values
            maxVal = val;  // Update max
        }
    }
    return maxVal;  // Return maximum value
}

// Main function - program entry point (W3Schools: C++ main)
int main() {  // Main function definition
    std::cout << "=== C++ OOP Demo ===" << std::endl;  // Program header

    // Create objects using smart pointers (W3Schools: C++ Smart Pointers)
    auto person1 = std::make_unique<Person>("Alice", 30);  // Unique pointer to Person
    auto employee1 = std::make_shared<Employee>("Bob", 25, "Engineering", 75000);  // Shared pointer to Employee

    // Display information
    std::cout << "\\nPerson Information:" << std::endl;  // Section header
    person1->display();  // Call method using pointer

    std::cout << "\\nEmployee Information:" << std::endl;  // Section header
    employee1->display();  // Call method

    // Modify employee data
    employee1->giveRaise(10);  // Give 10% raise
    employee1->display();  // Display updated info

    // Demonstrate polymorphism with base class pointers
    std::cout << "\\nPolymorphism Demo:" << std::endl;  // Section header
    std::vector<std::shared_ptr<Person>> people;  // Vector of Person pointers
    people.push_back(std::make_shared<Person>("Charlie", 35));  // Add Person
    people.push_back(std::make_shared<Employee>("Diana", 28, "Marketing", 65000));  // Add Employee

    for (const auto& person : people) {  // Iterate through vector
        person->display();  // Polymorphic call - calls appropriate display()
        std::cout << std::endl;  // New line
    }

    // Template function demonstration
    std::cout << "Template Function Demo:" << std::endl;  // Section header
    std::vector<int> numbers = {3, 1, 4, 1, 5, 9, 2, 6};  // Vector of integers
    std::vector<double> decimals = {3.14, 2.71, 1.41, 1.73};  // Vector of doubles

    try {  // Try-catch for exception handling (W3Schools: C++ Exceptions)
        int maxInt = findMax(numbers);  // Find max in int vector
        double maxDouble = findMax(decimals);  // Find max in double vector
        std::cout << "Max integer: " << maxInt << std::endl;  // Display result
        std::cout << "Max decimal: " << maxDouble << std::endl;  // Display result
    } catch (const std::exception& e) {  // Catch exceptions
        std::cerr << "Error: " << e.what() << std::endl;  // Error message
    }

    // Standard library algorithms (W3Schools: C++ Algorithms)
    std::cout << "\\nStandard Library Algorithms:" << std::endl;  // Section header
    std::sort(numbers.begin(), numbers.end());  // Sort vector (W3Schools: C++ Sort)
    std::cout << "Sorted numbers: ";  // Output label
    for (int num : numbers) {  // Iterate and display
        std::cout << num << " ";  // Print each number
    }
    std::cout << std::endl;  // New line

    // Lambda expressions - anonymous functions (W3Schools: C++ Lambdas)
    auto isEven = [](int x) { return x % 2 == 0; };  // Lambda for even check
    auto evenCount = std::count_if(numbers.begin(), numbers.end(), isEven);  // Count even numbers
    std::cout << "Even numbers count: " << evenCount << std::endl;  // Display count

    std::cout << "\\nProgram completed successfully!" << std::endl;  // Success message
    return 0;  // Return success code (W3Schools: C++ main return)
}`;
  }
  if (/(php)/i.test(lower)) {
    return `<?php
// PHP: Server-Side Web Development with Object-Oriented Programming
// W3Schools PHP Tutorial: https://www.w3schools.com/php/
// This example demonstrates PHP OOP, database interaction, and web development patterns

<?php  // PHP opening tag - indicates start of PHP code execution

// Prevent direct access - security best practice (W3Schools: PHP Security)
if (!defined('ALLOW_ACCESS')) {  // Check if constant is defined
    die('Direct access not permitted');  // Terminate script with message
}
define('ALLOW_ACCESS', true);  // Define access constant

// Class definition - blueprint for objects (W3Schools: PHP Classes)
class User {  // Class declaration
    // Properties - class variables (W3Schools: PHP Properties)
    private $userId;      // Private property - accessible only within class
    private $username;    // Private property for username
    private $email;       // Private property for email
    private $isActive;    // Private property for active status
    public static $userCount = 0;  // Static property - shared by all instances

    // Constructor - called when object is created (W3Schools: PHP Constructors)
    public function __construct($username, $email) {  // Constructor with parameters
        $this->username = $username;  // Assign parameter to property
        $this->email = $email;        // Assign email
        $this->isActive = true;       // Default active status
        $this->userId = ++self::$userCount;  // Increment and assign ID
        echo "User {$this->username} created with ID: {$this->userId}<br>";  // Output message
    }

    // Destructor - called when object is destroyed (W3Schools: PHP Destructors)
    public function __destruct() {  // Destructor method
        echo "User {$this->username} is being destroyed<br>";  // Cleanup message
    }

    // Public methods - accessible from outside class
    public function getUserInfo() {  // Method to get user information
        return [  // Return associative array
            'id' => $this->userId,      // User ID
            'username' => $this->username,  // Username
            'email' => $this->email,    // Email
            'active' => $this->isActive // Active status
        ];
    }

    public function updateEmail($newEmail) {  // Method to update email
        if (filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {  // Validate email format
            $this->email = $newEmail;  // Update email if valid
            return true;  // Return success
        }
        return false;  // Return failure
    }

    // Static method - can be called without instance (W3Schools: PHP Static Methods)
    public static function getTotalUsers() {  // Static method
        return self::$userCount;  // Return static property
    }

    // Magic method - toString for object string representation (W3Schools: PHP __toString)
    public function __toString() {  // Magic method
        return "User: {$this->username} ({$this->email})";  // String representation
    }
}

// Database connection class - demonstrates PDO usage (W3Schools: PHP PDO)
class Database {  // Database wrapper class
    private $pdo;  // Private PDO instance

    public function __construct() {  // Constructor
        try {  // Try-catch for error handling (W3Schools: PHP Try...Catch)
            // Create PDO connection (W3Schools: PHP PDO Connect)
            $this->pdo = new PDO(  // PDO constructor
                "mysql:host=localhost;dbname=userdb",  // DSN string
                "username",  // Database username
                "password",  // Database password
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]  // Error mode
            );
            echo "Database connected successfully<br>";  // Success message
        } catch (PDOException $e) {  // Catch PDO exceptions
            die("Connection failed: " . $e->getMessage());  // Terminate on error
        }
    }

    // Method to save user to database
    public function saveUser(User $user) {  // Method with type hinting
        $userInfo = $user->getUserInfo();  // Get user data
        $stmt = $this->pdo->prepare(  // Prepare statement (W3Schools: PHP Prepared Statements)
            "INSERT INTO users (username, email, is_active) VALUES (?, ?, ?)"  // SQL query
        );
        $stmt->execute([  // Execute with parameters
            $userInfo['username'],  // Username parameter
            $userInfo['email'],     // Email parameter
            $userInfo['active'] ? 1 : 0  // Active status as integer
        ]);
        return $this->pdo->lastInsertId();  // Return inserted ID
    }

    // Method to get all users
    public function getAllUsers() {  // Method to fetch users
        $stmt = $this->pdo->query("SELECT * FROM users");  // Execute query
        return $stmt->fetchAll(PDO::FETCH_ASSOC);  // Return associative array
    }
}

// Utility functions - demonstrate PHP functions (W3Schools: PHP Functions)
function validatePassword($password) {  // Function to validate password
    // Check length and complexity (W3Schools: PHP Regular Expressions)
    return strlen($password) >= 8 &&  // Minimum length
           preg_match('/[A-Z]/', $password) &&  // Uppercase letter
           preg_match('/[a-z]/', $password) &&  // Lowercase letter
           preg_match('/[0-9]/', $password);    // Number
}

function formatUserList($users) {  // Function to format user list
    if (empty($users)) {  // Check if array is empty (W3Schools: PHP Arrays)
        return "No users found.";  // Return message
    }

    $output = "<ul>";  // Start unordered list
    foreach ($users as $user) {  // Foreach loop (W3Schools: PHP Loops)
        $output .= "<li>{$user['username']} - {$user['email']}</li>";  // List item
    }
    $output .= "</ul>";  // End list
    return $output;  // Return formatted HTML
}

// Main execution - demonstrates usage
echo "<h1>PHP OOP and Database Demo</h1>";  // HTML heading

// Create user objects
$user1 = new User("alice_smith", "alice@example.com");  // Create User instance
$user2 = new User("bob_jones", "bob@example.com");     // Create another User

echo "<h2>User Information:</h2>";  // Section heading
echo "<pre>" . print_r($user1->getUserInfo(), true) . "</pre>";  // Display user info

// Update user email
if ($user1->updateEmail("alice.smith@company.com")) {  // Update email
    echo "Email updated successfully<br>";  // Success message
} else {
    echo "Invalid email format<br>";  // Error message
}

// Display total users
echo "Total users created: " . User::getTotalUsers() . "<br>";  // Static method call

// Password validation demo
$passwords = ["weak", "StrongPass123", "weakpass", "AnotherStrong1"];  // Test passwords
echo "<h2>Password Validation:</h2>";  // Section heading
foreach ($passwords as $pwd) {  // Loop through passwords
    $valid = validatePassword($pwd) ? "Valid" : "Invalid";  // Check validity
    echo "Password '$pwd': $valid<br>";  // Display result
}

// Database operations (commented out to avoid actual DB operations)
// Uncomment the following lines if you have a MySQL database set up
/*
$db = new Database();  // Create database instance
$userId = $db->saveUser($user1);  // Save user to database
echo "User saved with ID: $userId<br>";  // Display saved ID

$allUsers = $db->getAllUsers();  // Get all users
echo "<h2>All Users in Database:</h2>";  // Section heading
echo formatUserList($allUsers);  // Display formatted list
*/

// Array operations - demonstrate PHP arrays (W3Schools: PHP Arrays)
$userArray = [  // Associative array
    "name" => "Charlie Brown",  // Key-value pair
    "age" => 25,               // Another pair
    "skills" => ["PHP", "MySQL", "JavaScript"]  // Nested array
];

echo "<h2>Array Operations:</h2>";  // Section heading
echo "User name: " . $userArray["name"] . "<br>";  // Access array element
echo "Skills: " . implode(", ", $userArray["skills"]) . "<br>";  // Join array elements

// Demonstrate object serialization (W3Schools: PHP Serialization)
$serialized = serialize($user1);  // Serialize object
echo "<h2>Object Serialization:</h2>";  // Section heading
echo "Serialized user: " . $serialized . "<br>";  // Display serialized data

$unserialized = unserialize($serialized);  // Unserialize object
echo "Unserialized user: " . $unserialized . "<br>";  // Display unserialized object

echo "<h2>Script Execution Complete</h2>";  // Completion message

// PHP closing tag - optional but good practice
?>`;
  }
  if (/(sql|database|mysql|postgresql)/i.test(lower)) {
    return `-- SQL: Database Design and Query Optimization
-- W3Schools SQL Tutorial: https://www.w3schools.com/sql/
-- This example demonstrates SQL database operations, joins, and best practices

-- Create database - defines the database container (W3Schools: SQL CREATE DATABASE)
CREATE DATABASE IF NOT EXISTS company_db;  -- Create database if it doesn't exist
USE company_db;  -- Select the database to use

-- Create tables - define data structure (W3Schools: SQL CREATE TABLE)
-- Employees table - stores employee information
CREATE TABLE employees (  -- Table definition
    employee_id INT PRIMARY KEY AUTO_INCREMENT,  -- Primary key with auto increment (W3Schools: SQL PRIMARY KEY)
    first_name VARCHAR(50) NOT NULL,  -- Required field, max 50 characters (W3Schools: SQL NOT NULL)
    last_name VARCHAR(50) NOT NULL,   -- Required field
    email VARCHAR(100) UNIQUE NOT NULL,  -- Unique email constraint (W3Schools: SQL UNIQUE)
    hire_date DATE NOT NULL,  -- Employment start date (W3Schools: SQL DATE)
    salary DECIMAL(10,2) CHECK (salary > 0),  -- Salary with check constraint (W3Schools: SQL CHECK)
    department_id INT,  -- Foreign key reference
    manager_id INT,  -- Self-referencing foreign key
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Auto timestamp (W3Schools: SQL TIMESTAMP)
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- Auto update timestamp
    FOREIGN KEY (department_id) REFERENCES departments(department_id),  -- Foreign key constraint (W3Schools: SQL FOREIGN KEY)
    FOREIGN KEY (manager_id) REFERENCES employees(employee_id)  -- Self-reference for manager
);

-- Departments table - stores department information
CREATE TABLE departments (  -- Department table
    department_id INT PRIMARY KEY AUTO_INCREMENT,  -- Primary key
    department_name VARCHAR(100) NOT NULL UNIQUE,  -- Unique department name
    location VARCHAR(100),  -- Department location
    budget DECIMAL(12,2),  -- Department budget
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- Creation timestamp
);

-- Projects table - stores project information
CREATE TABLE projects (  -- Projects table
    project_id INT PRIMARY KEY AUTO_INCREMENT,  -- Primary key
    project_name VARCHAR(200) NOT NULL,  -- Project name
    description TEXT,  -- Project description (W3Schools: SQL TEXT)
    start_date DATE,  -- Project start
    end_date DATE,    -- Project end
    budget DECIMAL(12,2),  -- Project budget
    status ENUM('planning', 'active', 'completed', 'cancelled') DEFAULT 'planning',  -- Status enumeration (W3Schools: SQL ENUM)
    department_id INT,  -- Owning department
    FOREIGN KEY (department_id) REFERENCES departments(department_id)  -- Foreign key
);

-- Employee-Project junction table - many-to-many relationship (W3Schools: SQL Many-to-Many)
CREATE TABLE employee_projects (  -- Junction table
    employee_id INT,  -- Employee reference
    project_id INT,   -- Project reference
    role VARCHAR(50), -- Employee's role in project
    assigned_date DATE DEFAULT CURRENT_DATE,  -- Assignment date
    hours_allocated DECIMAL(5,2),  -- Hours allocated to project
    PRIMARY KEY (employee_id, project_id),  -- Composite primary key (W3Schools: SQL Composite Key)
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),  -- Foreign key
    FOREIGN KEY (project_id) REFERENCES projects(project_id)    -- Foreign key
);

-- Insert sample data - populate tables with data (W3Schools: SQL INSERT INTO)
INSERT INTO departments (department_name, location, budget) VALUES  -- Insert departments
('Engineering', 'Building A', 500000.00),
('Marketing', 'Building B', 300000.00),
('Sales', 'Building C', 250000.00),
('HR', 'Building A', 150000.00);

INSERT INTO employees (first_name, last_name, email, hire_date, salary, department_id) VALUES  -- Insert employees
('John', 'Doe', 'john.doe@company.com', '2023-01-15', 75000.00, 1),
('Jane', 'Smith', 'jane.smith@company.com', '2023-02-01', 80000.00, 1),
('Bob', 'Johnson', 'bob.johnson@company.com', '2023-01-20', 65000.00, 2),
('Alice', 'Williams', 'alice.williams@company.com', '2023-03-10', 70000.00, 3),
('Charlie', 'Brown', 'charlie.brown@company.com', '2023-02-15', 60000.00, 4);

-- Update manager references - set up hierarchy
UPDATE employees SET manager_id = 2 WHERE employee_id IN (1, 3);  -- Set managers
UPDATE employees SET manager_id = 5 WHERE employee_id = 4;  -- Set HR manager

INSERT INTO projects (project_name, description, start_date, end_date, budget, status, department_id) VALUES  -- Insert projects
('Website Redesign', 'Complete overhaul of company website', '2023-06-01', '2023-12-31', 150000.00, 'active', 1),
('Marketing Campaign', 'Q3 marketing campaign for new product', '2023-07-01', '2023-09-30', 75000.00, 'planning', 2),
('CRM Implementation', 'Implement new CRM system', '2023-08-01', '2024-01-31', 200000.00, 'planning', 3);

-- Assign employees to projects
INSERT INTO employee_projects (employee_id, project_id, role, hours_allocated) VALUES  -- Assign employees
(1, 1, 'Lead Developer', 160.00),  -- John on website project
(2, 1, 'Project Manager', 120.00), -- Jane on website project
(3, 2, 'Marketing Lead', 140.00),  -- Bob on marketing campaign
(4, 3, 'Sales Rep', 100.00);       -- Alice on CRM project

-- Basic SELECT queries - retrieve data (W3Schools: SQL SELECT)
-- Select all employees
SELECT * FROM employees;  -- Select all columns from employees

-- Select specific columns with aliases (W3Schools: SQL Aliases)
SELECT
    employee_id AS 'ID',  -- Column alias
    CONCAT(first_name, ' ', last_name) AS 'Full Name',  -- Concatenated name
    email AS 'Email Address',  -- Email alias
    salary AS 'Annual Salary'  -- Salary alias
FROM employees;

-- WHERE clause - filter results (W3Schools: SQL WHERE)
SELECT * FROM employees
WHERE salary > 70000  -- Filter by salary
AND department_id = 1; -- Filter by department

-- JOIN operations - combine data from multiple tables (W3Schools: SQL JOIN)
-- Inner join - employees with their departments
SELECT
    e.first_name,
    e.last_name,
    d.department_name,
    e.salary
FROM employees e  -- Table alias 'e'
INNER JOIN departments d ON e.department_id = d.department_id;  -- Join condition

-- Left join - all employees, even those without departments
SELECT
    e.first_name,
    e.last_name,
    COALESCE(d.department_name, 'Not Assigned') AS department  -- Handle NULL values (W3Schools: SQL IS NULL)
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id;

-- Complex join with multiple tables
SELECT
    e.first_name,
    e.last_name,
    d.department_name,
    p.project_name,
    ep.role,
    ep.hours_allocated
FROM employees e
JOIN departments d ON e.department_id = d.department_id
JOIN employee_projects ep ON e.employee_id = ep.employee_id
JOIN projects p ON ep.project_id = p.project_id;

-- Aggregate functions - summarize data (W3Schools: SQL COUNT, SUM, AVG)
SELECT
    COUNT(*) AS total_employees,  -- Count all employees
    AVG(salary) AS average_salary,  -- Average salary
    MAX(salary) AS highest_salary,  -- Maximum salary
    MIN(salary) AS lowest_salary,   -- Minimum salary
    SUM(salary) AS total_salary     -- Sum of all salaries
FROM employees;

-- GROUP BY - group results by category (W3Schools: SQL GROUP BY)
SELECT
    d.department_name,
    COUNT(e.employee_id) AS employee_count,
    AVG(e.salary) AS avg_salary,
    MAX(e.salary) AS max_salary
FROM departments d
LEFT JOIN employees e ON d.department_id = e.department_id
GROUP BY d.department_id, d.department_name  -- Group by department
ORDER BY avg_salary DESC;  -- Order by average salary descending

-- HAVING clause - filter grouped results (W3Schools: SQL HAVING)
SELECT
    d.department_name,
    COUNT(e.employee_id) AS employee_count,
    AVG(e.salary) AS avg_salary
FROM departments d
LEFT JOIN employees e ON d.department_id = e.department_id
GROUP BY d.department_id, d.department_name
HAVING COUNT(e.employee_id) > 1  -- Only departments with more than 1 employee
ORDER BY employee_count DESC;

-- Subqueries - nested queries (W3Schools: SQL Subqueries)
-- Find employees earning above department average
SELECT
    e.first_name,
    e.last_name,
    e.salary,
    d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id
WHERE e.salary > (  -- Subquery for department average
    SELECT AVG(salary)
    FROM employees
    WHERE department_id = e.department_id
);

-- Common Table Expressions (CTEs) - temporary named result sets (W3Schools: SQL CTE)
WITH department_stats AS (  -- CTE definition
    SELECT
        department_id,
        AVG(salary) AS avg_salary,
        COUNT(*) AS employee_count
    FROM employees
    GROUP BY department_id
)
SELECT
    d.department_name,
    ds.avg_salary,
    ds.employee_count,
    CASE  -- Conditional logic (W3Schools: SQL CASE)
        WHEN ds.employee_count > 2 THEN 'Large Department'
        WHEN ds.employee_count > 1 THEN 'Medium Department'
        ELSE 'Small Department'
    END AS department_size
FROM departments d
JOIN department_stats ds ON d.department_id = ds.department_id;

-- Indexes - improve query performance (W3Schools: SQL CREATE INDEX)
CREATE INDEX idx_employee_salary ON employees(salary);  -- Index on salary
CREATE INDEX idx_employee_dept ON employees(department_id);  -- Index on department
CREATE INDEX idx_employee_email ON employees(email);  -- Index on email

-- Views - virtual tables based on queries (W3Schools: SQL CREATE VIEW)
CREATE VIEW employee_details AS  -- Create view
SELECT
    e.employee_id,
    CONCAT(e.first_name, ' ', e.last_name) AS full_name,
    e.email,
    e.salary,
    d.department_name,
    e.hire_date
FROM employees e
JOIN departments d ON e.department_id = d.department_id;

-- Query the view
SELECT * FROM employee_details WHERE salary > 65000;

-- Stored procedures - reusable SQL code (W3Schools: SQL Stored Procedures)
DELIMITER $$  -- Change delimiter for procedure definition
CREATE PROCEDURE get_employee_projects(IN emp_id INT)  -- Procedure definition
BEGIN  -- Procedure body start
    SELECT
        p.project_name,
        ep.role,
        ep.hours_allocated,
        p.status
    FROM projects p
    JOIN employee_projects ep ON p.project_id = ep.project_id
    WHERE ep.employee_id = emp_id;
END $$  -- Procedure body end
DELIMITER ;  -- Reset delimiter

-- Call the stored procedure
CALL get_employee_projects(1);  -- Get projects for employee ID 1

-- Triggers - automatic actions on table changes (W3Schools: SQL Triggers)
CREATE TRIGGER update_employee_timestamp  -- Trigger definition
    BEFORE UPDATE ON employees  -- Trigger timing and table
    FOR EACH ROW  -- For each affected row
    SET NEW.updated_at = CURRENT_TIMESTAMP;  -- Set timestamp

-- Transactions - ensure data consistency (W3Schools: SQL Transactions)
START TRANSACTION;  -- Begin transaction
    UPDATE employees SET salary = salary * 1.05 WHERE department_id = 1;  -- 5% raise for engineering
    UPDATE departments SET budget = budget * 1.05 WHERE department_id = 1;  -- Update budget
COMMIT;  -- Commit transaction

-- Error handling with transactions
START TRANSACTION;
    -- Attempt to update
    UPDATE employees SET salary = -1000 WHERE employee_id = 1;  -- This will fail due to CHECK constraint
    -- If we reach here, commit
    COMMIT;
-- If error occurred, transaction automatically rolls back

-- Backup and restore concepts (mentioned in comments)
-- mysqldump company_db > company_backup.sql  -- Backup command
-- mysql -u username -p company_db < company_backup.sql  -- Restore command

-- Clean up - drop tables (use with caution!)
-- DROP TABLE IF EXISTS employee_projects;
-- DROP TABLE IF EXISTS projects;
-- DROP TABLE IF EXISTS employees;
-- DROP TABLE IF EXISTS departments;
-- DROP DATABASE IF EXISTS company_db;`;
  }
  if (/(python|pandas)/i.test(lower)) {
    return `# Python: Data Analysis with Pandas and NumPy
# W3Schools Python Tutorial: https://www.w3schools.com/python/
# This example demonstrates Python data manipulation using pandas and numpy libraries

import pandas as pd  # Import pandas library - essential for data manipulation and analysis in Python (W3Schools: Python Modules)
import numpy as np   # Import numpy library - provides support for large, multi-dimensional arrays and matrices (W3Schools: NumPy Tutorial)

# Create a sample dataset using a Python dictionary
# Dictionaries in Python are key-value pairs, perfect for organizing data (W3Schools: Python Dictionaries)
data = {  # Dictionary containing sample data - keys are column names, values are lists of data
    'Name': ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'],  # List of strings - Python's string data type (W3Schools: Python Strings)
    'Age': [25, 30, 35, 28, 32],  # List of integers - Python's int data type (W3Schools: Python Numbers)
    'City': ['New York', 'London', 'Tokyo', 'Paris', 'Sydney'],  # List of strings representing cities
    'Salary': [50000, 60000, 70000, 55000, 65000]  # List of integers representing salaries
}

# Create a pandas DataFrame from the dictionary
# DataFrame is pandas' primary data structure - like a spreadsheet or SQL table (W3Schools: Python Pandas)
df = pd.DataFrame(data)  # pd.DataFrame() constructor creates a DataFrame from dictionary
print("Original DataFrame:")  # print() function outputs text to console (W3Schools: Python Print)
print(df)  # Display the entire DataFrame
print("\\n")  # Print newline for better formatting

# Calculate basic statistics using pandas
# Pandas provides built-in statistical methods (W3Schools: Python Statistics)
print("Basic Statistics:")  # Header for statistics section
print(df.describe())  # describe() method provides summary statistics for numeric columns
print("\\n")  # Newline

# Filter data using conditional selection
# Boolean indexing in pandas allows filtering data based on conditions (W3Schools: Python Conditions)
print("Employees earning more than $60,000:")  # Header for filtered data
high_earners = df[df['Salary'] > 60000]  # Boolean mask filters rows where Salary > 60000
print(high_earners)  # Display filtered DataFrame
print("\\n")  # Newline

# Add a new column using vectorized operations
# Pandas allows column operations without explicit loops (W3Schools: Python Loops vs Iterators)
df['Bonus'] = df['Salary'] * 0.1  # Create new 'Bonus' column as 10% of salary
print("DataFrame with Bonus column:")  # Header
print(df)  # Display DataFrame with new column
print("\\n")  # Newline

# Group data and calculate aggregates
# groupby() method splits data into groups and applies functions (W3Schools: Python Group By)
print("Average salary by city:")  # Header
city_avg_salary = df.groupby('City')['Salary'].mean()  # Group by City, calculate mean Salary
print(city_avg_salary)  # Display grouped results
print("\\n")  # Newline

# Use NumPy for advanced mathematical operations
# NumPy provides efficient numerical computations (W3Schools: NumPy Tutorial)
salaries_array = np.array(df['Salary'])  # Convert pandas Series to NumPy array
print("Salary Statistics using NumPy:")  # Header
print(f"Mean Salary: \${salaries_array.mean():.2f}")  # Calculate and format mean
print(f"Median Salary: \${np.median(salaries_array):.2f}")  # Calculate median
print(f"Standard Deviation: \${salaries_array.std():.2f}")  # Calculate standard deviation
print(f"Minimum Salary: \${salaries_array.min()}")  # Find minimum value
print(f"Maximum Salary: \${salaries_array.max()}")  # Find maximum value

# Demonstrate Python functions and error handling
# Functions in Python are defined using def keyword (W3Schools: Python Functions)
def calculate_tax(salary, tax_rate=0.2):  # Function with default parameter
    """
    Calculate tax amount based on salary and tax rate.
    Args:
        salary (float): The employee's salary
        tax_rate (float): Tax rate as decimal (default 0.2 = 20%)
    Returns:
        float: Calculated tax amount
    """
    try:  # Try-except block for error handling (W3Schools: Python Try Except)
        if salary < 0:  # Conditional statement (W3Schools: Python If...Else)
            raise ValueError("Salary cannot be negative")  # Raise exception for invalid input
        tax_amount = salary * tax_rate  # Calculate tax
        return round(tax_amount, 2)  # Round to 2 decimal places (W3Schools: Python Math)
    except ValueError as e:  # Catch ValueError exceptions
        print(f"Error calculating tax: {e}")  # Print error message
        return 0.0  # Return default value

# Apply the function to DataFrame
# apply() method applies a function to each element (W3Schools: Python Lambda)
df['Tax'] = df['Salary'].apply(calculate_tax)  # Apply calculate_tax function to each salary
print("\\nDataFrame with Tax calculations:")  # Header
print(df)  # Display final DataFrame

# Demonstrate Python classes (Object-Oriented Programming)
# Classes are blueprints for creating objects (W3Schools: Python Classes)
class EmployeeAnalyzer:  # Class definition
    """A class for analyzing employee data."""  # Docstring for class documentation

    def __init__(self, dataframe):  # Constructor method (W3Schools: Python __init__)
        """Initialize the analyzer with a DataFrame."""
        self.data = dataframe  # Instance variable to store data
        self.total_employees = len(dataframe)  # Calculate total employees

    def get_high_performers(self, salary_threshold):  # Instance method
        """Get employees above salary threshold."""
        return self.data[self.data['Salary'] > salary_threshold]  # Return filtered data

    def calculate_total_payroll(self):  # Instance method
        """Calculate total company payroll including bonuses."""
        return (self.data['Salary'] + self.data['Bonus']).sum()  # Sum all salaries and bonuses

# Create instance of the class
analyzer = EmployeeAnalyzer(df)  # Instantiate the class
print(f"\\nTotal Employees: {analyzer.total_employees}")  # Display total count
print(f"Total Payroll: \${analyzer.calculate_total_payroll():,.2f}")  # Display formatted total

high_performers = analyzer.get_high_performers(60000)  # Get high performers
print("\\nHigh Performers (Salary > $60,000):")  # Header
print(high_performers)  # Display high performers`;
  }
  if (/(java\b)/i.test(lower)) {
    return `// Java: Object-Oriented Programming Example with Enterprise Patterns
// W3Schools Java Tutorial: https://www.w3schools.com/java/
// This example demonstrates Java OOP concepts, exception handling, and design patterns

// Package declaration - organizes classes into namespaces (W3Schools: Java Packages)
package com.example.employeemanagement;  // Package name using reverse domain naming convention

// Import statements - bring classes from other packages into scope (W3Schools: Java Import)
import java.util.ArrayList;  // Import ArrayList for dynamic arrays
import java.util.List;       // Import List interface for polymorphism
import java.time.LocalDate;  // Import LocalDate for date handling
import java.time.Period;     // Import Period for date calculations

// Abstract class - cannot be instantiated, serves as base class (W3Schools: Java Abstract Classes)
public abstract class Person {  // Abstract class definition
    // Private fields - encapsulation principle (W3Schools: Java Encapsulation)
    private String name;        // Private field - accessible only within this class
    private String email;       // Private field for email address
    private LocalDate birthDate; // Private field for birth date using LocalDate

    // Constructor - initializes object state (W3Schools: Java Constructors)
    public Person(String name, String email, LocalDate birthDate) {  // Constructor with parameters
        this.name = name;           // Assign parameter to instance variable using 'this'
        this.email = email;         // Assign email parameter
        this.birthDate = birthDate; // Assign birth date
    }

    // Public getter methods - provide controlled access to private fields (W3Schools: Java Getters and Setters)
    public String getName() {      // Getter for name
        return name;               // Return the name field
    }

    public String getEmail() {     // Getter for email
        return email;              // Return the email field
    }

    public LocalDate getBirthDate() { // Getter for birth date
        return birthDate;          // Return the birth date
    }

    // Public setter method with validation
    public void setEmail(String email) { // Setter for email with validation
        if (email != null && email.contains("@")) { // Validate email format (basic check)
            this.email = email;    // Assign if valid
        } else {
            throw new IllegalArgumentException("Invalid email format"); // Throw exception for invalid email
        }
    }

    // Abstract method - must be implemented by subclasses (W3Schools: Java Abstract Methods)
    public abstract void performRole(); // Abstract method declaration - no implementation

    // Concrete method - provides implementation
    public int getAge() { // Method to calculate age from birth date
        return Period.between(birthDate, LocalDate.now()).getYears(); // Calculate years between dates
    }

    // Override toString() method from Object class (W3Schools: Java toString())
    @Override // Annotation indicating method override
    public String toString() { // Override Object's toString method
        return String.format("Person{name='%s', email='%s', age=%d}", // Format string with placeholders
                           name, email, getAge()); // Fill placeholders with values
    }

    // Override equals() method for proper object comparison (W3Schools: Java equals())
    @Override
    public boolean equals(Object obj) { // Override Object's equals method
        if (this == obj) return true; // Check if same object reference
        if (obj == null || getClass() != obj.getClass()) return false; // Null and class checks
        Person person = (Person) obj; // Cast to Person type
        return name.equals(person.name) && email.equals(person.email); // Compare fields
    }

    // Override hashCode() when overriding equals() (W3Schools: Java hashCode())
    @Override
    public int hashCode() { // Override Object's hashCode method
        return name.hashCode() + email.hashCode(); // Generate hash from fields
    }
}

// Interface - defines contract for classes (W3Schools: Java Interfaces)
interface Workable { // Interface declaration
    void work();     // Abstract method - no implementation
    double getSalary(); // Abstract method for salary
    default void takeBreak() { // Default method with implementation (Java 8+ feature)
        System.out.println("Taking a break..."); // Default implementation
    }
}

// Employee class extending Person and implementing Workable
public class Employee extends Person implements Workable { // Inheritance and interface implementation
    // Additional private fields specific to Employee
    private String employeeId;     // Unique employee identifier
    private String department;     // Department name
    private double salary;         // Employee salary
    private String position;       // Job position/title

    // Static field - shared among all instances (W3Schools: Java Static)
    private static int employeeCount = 0; // Counter for total employees

    // Constructor chaining - calls parent constructor (W3Schools: Java Constructors)
    public Employee(String name, String email, LocalDate birthDate,
                   String department, double salary, String position) {
        super(name, email, birthDate); // Call parent constructor with super()
        this.employeeId = generateEmployeeId(); // Generate unique ID
        this.department = department;   // Assign department
        this.salary = salary;          // Assign salary
        this.position = position;      // Assign position
        employeeCount++;              // Increment static counter
    }

    // Private helper method to generate employee ID
    private String generateEmployeeId() { // Private method - accessible only within class
        return "EMP" + String.format("%04d", employeeCount + 1); // Format ID with leading zeros
    }

    // Implementation of abstract method from Person
    @Override // Override annotation
    public void performRole() { // Implement abstract method
        System.out.println(getName() + " is working as " + position + " in " + department);
    }

    // Implementation of interface methods
    @Override
    public void work() { // Implement Workable interface method
        System.out.println("Employee " + getName() + " is performing job duties");
    }

    @Override
    public double getSalary() { // Implement Workable interface method
        return salary; // Return salary field
    }

    // Additional methods specific to Employee
    public void giveRaise(double percentage) { // Method to increase salary
        if (percentage > 0 && percentage <= 0.5) { // Validate percentage range
            salary *= (1 + percentage); // Calculate new salary
            System.out.println("Salary increased by " + (percentage * 100) + "%");
        } else {
            throw new IllegalArgumentException("Invalid raise percentage"); // Throw exception
        }
    }

    // Static method - can be called without instance (W3Schools: Java Static Methods)
    public static int getEmployeeCount() { // Static method
        return employeeCount; // Return static field
    }

    // Override toString() to include Employee-specific information
    @Override
    public String toString() { // Override toString method
        return String.format("Employee{employeeId='%s', name='%s', department='%s', position='%s', salary=%.2f}",
                           employeeId, getName(), department, position, salary);
    }
}

// Main class - contains main method (entry point) (W3Schools: Java Main Method)
public class EmployeeManagementSystem { // Main class
    public static void main(String[] args) { // Main method - program entry point
        try { // Try-catch block for exception handling (W3Schools: Java Exceptions)
            // Create Employee objects using constructor
            Employee emp1 = new Employee("Alice Johnson", "alice@company.com",
                                       LocalDate.of(1990, 5, 15), "Engineering", 75000.0, "Software Engineer");

            Employee emp2 = new Employee("Bob Smith", "bob@company.com",
                                       LocalDate.of(1985, 8, 22), "Marketing", 65000.0, "Marketing Manager");

            Employee emp3 = new Employee("Carol Davis", "carol@company.com",
                                       LocalDate.of(1992, 12, 3), "HR", 55000.0, "HR Specialist");

            // Create a List to store employees (polymorphism - List interface, ArrayList implementation)
            List<Employee> employees = new ArrayList<>(); // Create ArrayList instance
            employees.add(emp1); // Add employee to list
            employees.add(emp2); // Add employee to list
            employees.add(emp3); // Add employee to list

            // Display employee information
            System.out.println("=== Employee Management System ==="); // Header
            System.out.println("Total Employees: " + Employee.getEmployeeCount()); // Display count
            System.out.println(); // Empty line

            // Iterate through employees using enhanced for loop (W3Schools: Java For Loop)
            for (Employee emp : employees) { // Enhanced for-each loop
                System.out.println("Employee Details:"); // Section header
                System.out.println(emp.toString()); // Display employee info
                emp.performRole(); // Call method
                System.out.println("Salary: $" + emp.getSalary()); // Display salary
                System.out.println(); // Empty line
            }

            // Demonstrate polymorphism - treat Employees as Workable objects
            System.out.println("=== Work Activities ==="); // Section header
            List<Workable> workers = new ArrayList<>(employees); // Polymorphism - List<Workable>
            for (Workable worker : workers) { // Iterate through workers
                worker.work(); // Call work method (polymorphism)
                worker.takeBreak(); // Call default method from interface
                System.out.println("Salary: $" + worker.getSalary()); // Display salary
                System.out.println(); // Empty line
            }

            // Demonstrate salary raise with exception handling
            System.out.println("=== Salary Management ==="); // Section header
            try { // Nested try-catch
                emp1.giveRaise(0.1); // Give 10% raise
                System.out.println("New salary for " + emp1.getName() + ": $" + emp1.getSalary());
                // emp1.giveRaise(0.8); // This would throw exception (commented out)
            } catch (IllegalArgumentException e) { // Catch specific exception
                System.out.println("Error giving raise: " + e.getMessage()); // Display error
            }

        } catch (Exception e) { // Catch any remaining exceptions
            System.err.println("An unexpected error occurred: " + e.getMessage()); // Error message
            e.printStackTrace(); // Print stack trace for debugging
        }
    }
}`;
  }
  if (/(dart|flutter)/i.test(lower)) {
    return `// Dart: Flutter Mobile App Development with State Management
// W3Schools Dart Tutorial: https://www.w3schools.com/dart/
// This example demonstrates Flutter widgets, state management, and Dart language features

// Import statements - bring libraries into scope (W3Schools: Dart Syntax)
import 'package:flutter/material.dart';  // Import Flutter's material design library
import 'dart:async';  // Import Dart's async library for Timer
import 'dart:math';   // Import Dart's math library for Random

// Main function - entry point of Flutter app (W3Schools: Dart Functions)
void main() {  // void indicates function returns nothing
  runApp(MyApp());  // runApp() starts the Flutter app with root widget
}

// Root widget - extends StatelessWidget (immutable widget) (W3Schools: Dart Classes)
class MyApp extends StatelessWidget {  // StatelessWidget for widgets that don't change
  @override  // Override annotation - implementing inherited method
  Widget build(BuildContext context) {  // build() method returns widget tree
    return MaterialApp(  // MaterialApp provides material design theme
      title: 'Flutter Counter App',  // App title (shown in task manager)
      theme: ThemeData(  // ThemeData defines app-wide styling
        primarySwatch: Colors.blue,  // Primary color scheme
        visualDensity: VisualDensity.adaptivePlatformDensity,  // Adaptive density
      ),
      home: CounterPage(),  // Home page widget
      debugShowCheckedModeBanner: false,  // Hide debug banner
    );
  }
}

// Counter page - StatefulWidget for mutable state (W3Schools: Dart Classes)
class CounterPage extends StatefulWidget {  // StatefulWidget for widgets with changing state
  @override  // Override createState method
  _CounterPageState createState() => _CounterPageState();  // Return state object
}

// State class for CounterPage - manages state and lifecycle (W3Schools: Dart Classes)
class _CounterPageState extends State<CounterPage> {  // Private state class
  // Instance variables - state data (W3Schools: Dart Variables)
  int _counter = 0;  // Counter value, initialized to 0
  bool _isEven = true;  // Boolean flag for even/odd state
  String _message = 'Tap the button!';  // Display message
  Timer? _timer;  // Nullable Timer for auto-increment (Dart null safety)
  List<String> _history = [];  // List to store counter history

  // initState() - called when state object is created (W3Schools: Dart Lifecycle)
  @override
  void initState() {  // Override lifecycle method
    super.initState();  // Call parent initState
    _startAutoIncrement();  // Start automatic counter increment
  }

  // dispose() - called when state object is removed (W3Schools: Dart Lifecycle)
  @override
  void dispose() {  // Override lifecycle method
    _timer?.cancel();  // Cancel timer if exists (null safety)
    super.dispose();  // Call parent dispose
  }

  // Private method to start automatic increment timer
  void _startAutoIncrement() {  // Private method (underscore prefix)
    _timer = Timer.periodic(Duration(seconds: 5), (timer) {  // Timer.periodic creates repeating timer
      setState(() {  // setState() triggers UI rebuild
        _counter++;  // Increment counter
        _updateState();  // Update dependent state
        _addToHistory('Auto-increment: $_counter');  // Add to history
      });
    });
  }

  // Private method to update dependent state variables
  void _updateState() {  // Private method for state logic
    _isEven = _counter % 2 == 0;  // Modulo operator for even check (W3Schools: Dart Operators)
    _message = _isEven ? 'Even number!' : 'Odd number!';  // Ternary operator (W3Schools: Dart Conditions)
  }

  // Private method to add entry to history list
  void _addToHistory(String entry) {  // Method with String parameter
    _history.add(entry);  // Add to list (W3Schools: Dart Lists)
    if (_history.length > 10) {  // Limit history to 10 entries
      _history.removeAt(0);  // Remove oldest entry
    }
  }

  // Method to increment counter manually
  void _incrementCounter() {  // Void method for button press
    setState(() {  // setState triggers rebuild
      _counter++;  // Increment counter
      _updateState();  // Update state
      _addToHistory('Manual increment: $_counter');  // Add to history
    });
  }

  // Method to decrement counter
  void _decrementCounter() {  // Void method for decrement
    setState(() {  // setState triggers rebuild
      if (_counter > 0) {  // Prevent negative counter
        _counter--;  // Decrement counter
        _updateState();  // Update state
        _addToHistory('Manual decrement: $_counter');  // Add to history
      }
    });
  }

  // Method to reset counter
  void _resetCounter() {  // Void method for reset
    setState(() {  // setState triggers rebuild
      _counter = 0;  // Reset to zero
      _updateState();  // Update state
      _history.clear();  // Clear history list
      _addToHistory('Counter reset to 0');  // Add reset message
    });
  }

  // Method to generate random number
  void _randomCounter() {  // Void method for random
    final random = Random();  // Create Random instance (W3Schools: Dart Random)
    setState(() {  // setState triggers rebuild
      _counter = random.nextInt(100);  // Random number 0-99
      _updateState();  // Update state
      _addToHistory('Random value: $_counter');  // Add to history
    });
  }

  // build() method - returns widget tree (W3Schools: Dart Functions)
  @override
  Widget build(BuildContext context) {  // Override build method
    return Scaffold(  // Scaffold provides app structure
      appBar: AppBar(  // App bar at top
        title: Text('Flutter Counter Demo'),  // App bar title
        backgroundColor: _isEven ? Colors.blue : Colors.red,  // Dynamic color
        actions: [  // Action buttons in app bar
          IconButton(  // Icon button widget
            icon: Icon(Icons.refresh),  // Refresh icon
            onPressed: _resetCounter,  // Reset function
            tooltip: 'Reset Counter',  // Tooltip text
          ),
          IconButton(  // Another icon button
            icon: Icon(Icons.shuffle),  // Shuffle icon
            onPressed: _randomCounter,  // Random function
            tooltip: 'Random Value',  // Tooltip text
          ),
        ],
      ),
      body: Container(  // Container for body content
        padding: EdgeInsets.all(16.0),  // Padding around content
        child: Column(  // Column for vertical layout
          mainAxisAlignment: MainAxisAlignment.center,  // Center vertically
          children: <Widget>[  // List of child widgets
            // Counter display section
            Card(  // Card widget for elevated container
              elevation: 4.0,  // Shadow elevation
              child: Padding(  // Padding inside card
                padding: EdgeInsets.all(16.0),  // Padding value
                child: Column(  // Nested column
                  children: [
                    Text(  // Text widget
                      'Current Counter Value:',  // Display text
                      style: TextStyle(  // Text styling
                        fontSize: 18.0,  // Font size
                        fontWeight: FontWeight.bold,  // Bold weight
                      ),
                    ),
                    SizedBox(height: 8.0),  // Spacing widget
                    Text(  // Counter value text
                      '\$_counter',  // String interpolation (W3Schools: Dart Strings)
                      style: TextStyle(  // Text style
                        fontSize: 48.0,  // Large font
                        fontWeight: FontWeight.bold,  // Bold
                        color: _isEven ? Colors.green : Colors.orange,  // Dynamic color
                      ),
                    ),
                    SizedBox(height: 8.0),  // Spacing
                    Text(  // Message text
                      _message,  // Display message
                      style: TextStyle(  // Text style
                        fontSize: 16.0,  // Medium font
                        color: Colors.grey[600],  // Grey color
                      ),
                    ),
                  ],
                ),
              ),
            ),

            SizedBox(height: 24.0),  // Spacing between sections

            // Control buttons section
            Row(  // Row for horizontal layout
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,  // Space evenly
              children: [  // List of buttons
                ElevatedButton.icon(  // Elevated button with icon
                  onPressed: _decrementCounter,  // Decrement function
                  icon: Icon(Icons.remove),  // Minus icon
                  label: Text('Decrement'),  // Button text
                  style: ElevatedButton.styleFrom(  // Button styling
                    backgroundColor: Colors.red,  // Red background
                  ),
                ),
                ElevatedButton.icon(  // Elevated button with icon
                  onPressed: _incrementCounter,  // Increment function
                  icon: Icon(Icons.add),  // Plus icon
                  label: Text('Increment'),  // Button text
                  style: ElevatedButton.styleFrom(  // Button styling
                    backgroundColor: Colors.green,  // Green background
                  ),
                ),
              ],
            ),

            SizedBox(height: 24.0),  // Spacing

            // History section
            Expanded(  // Expanded to fill remaining space
              child: Card(  // Card for history
                child: Padding(  // Padding inside card
                  padding: EdgeInsets.all(16.0),  // Padding
                  child: Column(  // Column for history content
                    crossAxisAlignment: CrossAxisAlignment.start,  // Left align
                    children: [
                      Text(  // History header
                        'Counter History:',  // Header text
                        style: TextStyle(  // Text style
                          fontSize: 16.0,  // Font size
                          fontWeight: FontWeight.bold,  // Bold
                        ),
                      ),
                      SizedBox(height: 8.0),  // Spacing
                      Expanded(  // Expanded for scrollable content
                        child: ListView.builder(  // ListView for scrollable list
                          itemCount: _history.length,  // Number of items
                          itemBuilder: (context, index) {  // Builder function
                            return ListTile(  // List item widget
                              leading: CircleAvatar(  // Circular avatar
                                child: Text('\${index + 1}'),  // Item number
                              ),
                              title: Text(_history[index]),  // History text
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),

      // Floating action button
      floatingActionButton: FloatingActionButton(  // FAB widget
        onPressed: _incrementCounter,  // Increment function
        tooltip: 'Increment Counter',  // Tooltip
        child: Icon(Icons.add),  // Plus icon
        backgroundColor: Colors.blue,  // Blue background
      ),
    );
  }
}`;
  }
  if (/(react|jsx|reactjs)/i.test(lower)) {
    return `// React JS: Modern Component Architecture with Hooks and Context
// W3Schools React Tutorial: https://www.w3schools.com/react/
// This example demonstrates React hooks, context API, custom hooks, and modern React patterns

import React, { useState, useEffect, useContext, useReducer, useMemo, useCallback, createContext } from 'react';  // Import React hooks and APIs (W3Schools: React ES6)
import './App.css';  // Import CSS file for styling

// Create Context for theme management (W3Schools: React Context)
const ThemeContext = createContext();  // createContext() creates a Context object

// Custom hook for localStorage persistence (W3Schools: React Custom Hooks)
function useLocalStorage(key, initialValue) {  // Custom hook function (convention: use prefix)
  // useState hook for state management (W3Schools: React useState Hook)
  const [storedValue, setStoredValue] = useState(() => {  // Lazy initial state
    try {  // Try-catch for error handling
      const item = window.localStorage.getItem(key);  // Get item from localStorage
      return item ? JSON.parse(item) : initialValue;  // Parse JSON or return initial value
    } catch (error) {  // Catch parsing errors
      console.error(\`Error reading localStorage key "\${key}":\`, error);  // Log error
      return initialValue;  // Return initial value on error
    }
  });

  // useCallback hook to memoize the setter function (W3Schools: React useCallback Hook)
  const setValue = useCallback((value) => {  // Memoized callback
    try {  // Try-catch for error handling
      const valueToStore = value instanceof Function ? value(storedValue) : value;  // Handle function updates
      setStoredValue(valueToStore);  // Update state
      window.localStorage.setItem(key, JSON.stringify(valueToStore));  // Save to localStorage
    } catch (error) {  // Catch storage errors
      console.error(\`Error setting localStorage key "\${key}":\`, error);  // Log error
    }
  }, [key, storedValue]);  // Dependencies array

  return [storedValue, setValue];  // Return array (like useState)
}

// Reducer function for todo operations (W3Schools: React useReducer Hook)
function todoReducer(state, action) {  // Pure function for state updates
  switch (action.type) {  // Switch on action type
    case 'ADD_TODO':  // Add todo action
      return {  // Return new state
        ...state,  // Spread existing state
        todos: [...state.todos, {  // Add new todo to array
          id: Date.now(),  // Unique ID using timestamp
          text: action.payload,  // Todo text from action
          completed: false,  // Default completed state
          createdAt: new Date().toISOString(),  // Creation timestamp
        }],
      };
    case 'TOGGLE_TODO':  // Toggle completion action
      return {  // Return new state
        ...state,  // Spread existing state
        todos: state.todos.map(todo =>  // Map over todos
          todo.id === action.payload  // Find matching todo
            ? { ...todo, completed: !todo.completed }  // Toggle completed
            : todo  // Return unchanged
        ),
      };
    case 'DELETE_TODO':  // Delete todo action
      return {  // Return new state
        ...state,  // Spread existing state
        todos: state.todos.filter(todo => todo.id !== action.payload),  // Filter out deleted todo
      };
    case 'EDIT_TODO':  // Edit todo action
      return {  // Return new state
        ...state,  // Spread existing state
        todos: state.todos.map(todo =>  // Map over todos
          todo.id === action.payload.id  // Find matching todo
            ? { ...todo, text: action.payload.text }  // Update text
            : todo  // Return unchanged
        ),
      };
    case 'CLEAR_COMPLETED':  // Clear completed todos
      return {  // Return new state
        ...state,  // Spread existing state
        todos: state.todos.filter(todo => !todo.completed),  // Keep only incomplete
      };
    default:  // Default case
      return state;  // Return unchanged state
  }
}

// Theme Provider Component (W3Schools: React Context)
function ThemeProvider({ children }) {  // Component that provides theme context
  const [theme, setTheme] = useLocalStorage('theme', 'light');  // Use custom hook for theme

  // useMemo hook for computed values (W3Schools: React useMemo Hook)
  const themeValue = useMemo(() => ({  // Memoize theme object
    theme,  // Current theme
    setTheme,  // Theme setter
    toggleTheme: () => setTheme(theme === 'light' ? 'dark' : 'light'),  // Toggle function
  }), [theme, setTheme]);  // Dependencies

  return (  // Return Provider component
    <ThemeContext.Provider value={themeValue}>  {/* Provide theme context */}
      {children}  {/* Render children */}
    </ThemeContext.Provider>
  );
}

// Custom hook to use theme context (W3Schools: React useContext Hook)
function useTheme() {  // Custom hook for theme
  const context = useContext(ThemeContext);  // Get context value
  if (!context) {  // Check if used outside provider
    throw new Error('useTheme must be used within a ThemeProvider');  // Throw error
  }
  return context;  // Return context
}

// TodoItem Component - displays individual todo (W3Schools: React Components)
function TodoItem({ todo, onToggle, onDelete, onEdit }) {  // Functional component with props
  const [isEditing, setIsEditing] = useState(false);  // Local state for edit mode
  const [editText, setEditText] = useState(todo.text);  // Local state for edit text

  // useEffect hook for focus management (W3Schools: React useEffect Hook)
  useEffect(() => {  // Effect for input focus
    if (isEditing) {  // If in edit mode
      // Focus input when entering edit mode (would need ref in real implementation)
    }
  }, [isEditing]);  // Dependency on edit mode

  const handleSubmit = (e) => {  // Handle form submission
    e.preventDefault();  // Prevent default form behavior
    if (editText.trim()) {  // Check for non-empty text
      onEdit(todo.id, editText.trim());  // Call edit callback
      setIsEditing(false);  // Exit edit mode
    }
  };

  const handleCancel = () => {  // Handle cancel edit
    setEditText(todo.text);  // Reset edit text
    setIsEditing(false);  // Exit edit mode
  };

  return (  // Return JSX
    <div className={\`todo-item \${todo.completed ? 'completed' : ''}\`}>  {/* Conditional class */}
      {isEditing ? (  // Conditional rendering for edit mode
        <form onSubmit={handleSubmit} className="edit-form">  {/* Edit form */}
          <input  {/* Input field */}
            type="text"  {/* Text input */}
            value={editText}  {/* Controlled value */}
            onChange={(e) => setEditText(e.target.value)}  {/* Update state */}
            className="edit-input"  {/* CSS class */}
            autoFocus  {/* Auto focus on render */}
          />
          <div className="edit-buttons">  {/* Button container */}
            <button type="submit" className="save-btn">Save</button>  {/* Save button */}
            <button type="button" onClick={handleCancel} className="cancel-btn">Cancel</button>  {/* Cancel button */}
          </div>
        </form>
      ) : (  // Normal display mode
        <div className="todo-content">  {/* Todo content container */}
          <input  {/* Checkbox */}
            type="checkbox"  {/* Checkbox input */}
            checked={todo.completed}  {/* Controlled checked state */}
            onChange={() => onToggle(todo.id)}  {/* Toggle callback */}
            className="todo-checkbox"  {/* CSS class */}
          />
          <span  {/* Todo text */}
            className="todo-text"  {/* CSS class */}
            onDoubleClick={() => setIsEditing(true)}  {/* Double-click to edit */}
          >
            {todo.text}  {/* Display todo text */}
          </span>
          <div className="todo-actions">  {/* Action buttons */}
            <button  {/* Edit button */}
              onClick={() => setIsEditing(true)}  {/* Enter edit mode */}
              className="edit-btn"  {/* CSS class */}
              title="Edit todo"  {/* Tooltip */}
            >
              ✏️  {/* Edit emoji */}
            </button>
            <button  {/* Delete button */}
              onClick={() => onDelete(todo.id)}  {/* Delete callback */}
              className="delete-btn"  {/* CSS class */}
              title="Delete todo"  {/* Tooltip */}
            >
              🗑️  {/* Delete emoji */}
            </button>
          </div>
        </div>
      )}
      <div className="todo-meta">  {/* Metadata display */}
        Created: {new Date(todo.createdAt).toLocaleDateString()}  {/* Formatted date */}
      </div>
    </div>
  );
}

// TodoList Component - displays list of todos (W3Schools: React Lists)
function TodoList({ todos, onToggle, onDelete, onEdit }) {  // Component with props
  if (todos.length === 0) {  // Conditional rendering for empty list
    return (  // Return JSX for empty state
      <div className="empty-state">  {/* Empty state container */}
        <p>No todos yet. Add one above!</p>  {/* Empty state message */}
      </div>
    );
  }

  return (  // Return JSX for todo list
    <div className="todo-list">  {/* List container */}
      {todos.map((todo) => (  // Map over todos array (W3Schools: React Lists)
        <TodoItem  {/* TodoItem component */}
          key={todo.id}  {/* Unique key for React reconciliation */}
          todo={todo}  {/* Pass todo object */}
          onToggle={onToggle}  {/* Pass toggle callback */}
          onDelete={onDelete}  {/* Pass delete callback */}
          onEdit={onEdit}  {/* Pass edit callback */}
        />
      ))}
    </div>
  );
}

// TodoForm Component - form for adding new todos (W3Schools: React Forms)
function TodoForm({ onAdd }) {  // Component with add callback
  const [text, setText] = useState('');  // State for input text

  const handleSubmit = (e) => {  // Handle form submission
    e.preventDefault();  // Prevent page reload
    if (text.trim()) {  // Check for non-empty text
      onAdd(text.trim());  // Call add callback
      setText('');  // Clear input
    }
  };

  return (  // Return JSX
    <form onSubmit={handleSubmit} className="todo-form">  {/* Form element */}
      <div className="input-group">  {/* Input group container */}
        <input  {/* Text input */}
          type="text"  {/* Text input type */}
          value={text}  {/* Controlled value */}
          onChange={(e) => setText(e.target.value)}  {/* Update state */}
          placeholder="What needs to be done?"  {/* Placeholder text */}
          className="todo-input"  {/* CSS class */}
          maxLength={100}  {/* Maximum length */}
        />
        <button  {/* Submit button */}
          type="submit"  {/* Submit button type */}
          className="add-btn"  {/* CSS class */}
          disabled={!text.trim()}  {/* Disable if empty */}
        >
          Add Todo  {/* Button text */}
        </button>
      </div>
    </form>
  );
}

// TodoStats Component - displays statistics (W3Schools: React Props)
function TodoStats({ todos }) {  // Component with todos prop
  // useMemo for expensive calculations (W3Schools: React useMemo Hook)
  const stats = useMemo(() => {  // Memoize stats calculation
    const total = todos.length;  // Total todos
    const completed = todos.filter(todo => todo.completed).length;  // Completed count
    const pending = total - completed;  // Pending count
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;  // Completion percentage

    return { total, completed, pending, completionRate };  // Return stats object
  }, [todos]);  // Recalculate when todos change

  return (  // Return JSX
    <div className="todo-stats">  {/* Stats container */}
      <div className="stat-item">  {/* Individual stat */}
        <span className="stat-label">Total:</span>  {/* Label */}
        <span className="stat-value">{stats.total}</span>  {/* Value */}
      </div>
      <div className="stat-item">  {/* Individual stat */}
        <span className="stat-label">Completed:</span>  {/* Label */}
        <span className="stat-value completed">{stats.completed}</span>  {/* Value with class */}
      </div>
      <div className="stat-item">  {/* Individual stat */}
        <span className="stat-label">Pending:</span>  {/* Label */}
        <span className="stat-value pending">{stats.pending}</span>  {/* Value with class */}
      </div>
      <div className="stat-item">  {/* Individual stat */}
        <span className="stat-label">Completion:</span>  {/* Label */}
        <span className="stat-value">{stats.completionRate}%</span>  {/* Value */}
      </div>
    </div>
  );
}

// Main App Component (W3Schools: React Components)
function App() {  // Main component
  // useReducer hook for complex state management (W3Schools: React useReducer Hook)
  const [state, dispatch] = useReducer(todoReducer, { todos: [] });  // State and dispatch

  // useLocalStorage custom hook for persistence
  const [filter, setFilter] = useLocalStorage('filter', 'all');  // Filter state

  // useMemo for filtered todos (W3Schools: React useMemo Hook)
  const filteredTodos = useMemo(() => {  // Memoize filtered todos
    switch (filter) {  // Switch on filter
      case 'active':  // Show only active
        return state.todos.filter(todo => !todo.completed);  // Filter incomplete
      case 'completed':  // Show only completed
        return state.todos.filter(todo => todo.completed);  // Filter complete
      default:  // Show all
        return state.todos;  // Return all todos
    }
  }, [state.todos, filter]);  // Dependencies

  // Event handlers using useCallback (W3Schools: React useCallback Hook)
  const handleAddTodo = useCallback((text) => {  // Memoized add handler
    dispatch({ type: 'ADD_TODO', payload: text });  // Dispatch add action
  }, []);  // No dependencies

  const handleToggleTodo = useCallback((id) => {  // Memoized toggle handler
    dispatch({ type: 'TOGGLE_TODO', payload: id });  // Dispatch toggle action
  }, []);  // No dependencies

  const handleDeleteTodo = useCallback((id) => {  // Memoized delete handler
    dispatch({ type: 'DELETE_TODO', payload: id });  // Dispatch delete action
  }, []);  // No dependencies

  const handleEditTodo = useCallback((id, text) => {  // Memoized edit handler
    dispatch({ type: 'EDIT_TODO', payload: { id, text } });  // Dispatch edit action
  }, []);  // No dependencies

  const handleClearCompleted = useCallback(() => {  // Memoized clear handler
    dispatch({ type: 'CLEAR_COMPLETED' });  // Dispatch clear action
  }, []);  // No dependencies

  const { theme, toggleTheme } = useTheme();  // Get theme from context

  return (  // Return JSX
    <div className={\`app \${theme}\`}>  {/* Root container with theme class */}
      <header className="app-header">  {/* App header */}
        <h1>React Todo App</h1>  {/* App title */}
        <button onClick={toggleTheme} className="theme-toggle">  {/* Theme toggle button */}
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}  {/* Dynamic button text */}
        </button>
      </header>

      <main className="app-main">  {/* Main content */}
        <TodoForm onAdd={handleAddTodo} />  {/* Todo form component */}

        <div className="todo-controls">  {/* Controls container */}
          <div className="filter-buttons">  {/* Filter buttons */}
            <button  {/* All filter */}
              onClick={() => setFilter('all')}  {/* Set filter */}
              className={\`filter-btn \${filter === 'all' ? 'active' : ''}\`}  {/* Conditional class */}
            >
              All  {/* Button text */}
            </button>
            <button  {/* Active filter */}
              onClick={() => setFilter('active')}  {/* Set filter */}
              className={\`filter-btn \${filter === 'active' ? 'active' : ''}\`}  {/* Conditional class */}
            >
              Active  {/* Button text */}
            </button>
            <button  {/* Completed filter */}
              onClick={() => setFilter('completed')}  {/* Set filter */}
              className={\`filter-btn \${filter === 'completed' ? 'active' : ''}\`}  {/* Conditional class */}
            >
              Completed  {/* Button text */}
            </button>
          </div>

          <button  {/* Clear completed button */}
            onClick={handleClearCompleted}  {/* Clear handler */}
            className="clear-btn"  {/* CSS class */}
            disabled={!state.todos.some(todo => todo.completed)}  {/* Disable if no completed */}
          >
            Clear Completed  {/* Button text */}
          </button>
        </div>

        <TodoStats todos={state.todos} />  {/* Stats component */}
        <TodoList  {/* Todo list component */}
          todos={filteredTodos}  {/* Pass filtered todos */}
          onToggle={handleToggleTodo}  {/* Pass toggle handler */}
          onDelete={handleDeleteTodo}  {/* Pass delete handler */}
          onEdit={handleEditTodo}  {/* Pass edit handler */}
        />
      </main>
    </div>
  );
}

// App wrapper with ThemeProvider (W3Schools: React Context)
export default function AppWithTheme() {  // Export wrapped component
  return (  // Return JSX
    <ThemeProvider>  {/* Theme provider */}
      <App />  {/* Main app */}
    </ThemeProvider>
  );
}`;
  }
  if (/(node|nodejs|express|backend)/i.test(lower)) {
    return `// Node.js: RESTful API with Express.js and MongoDB
// W3Schools Node.js Tutorial: https://www.w3schools.com/nodejs/
// This example demonstrates Node.js server-side development with Express framework and MongoDB

const express = require('express');  // Import Express.js framework for building web applications (W3Schools: Node.js Modules)
const mongoose = require('mongoose');  // Import Mongoose ODM for MongoDB interactions (W3Schools: Node.js MongoDB)
const cors = require('cors');  // Import CORS middleware for cross-origin requests
const helmet = require('helmet');  // Import Helmet for security headers
const morgan = require('morgan');  // Import Morgan for HTTP request logging
const rateLimit = require('express-rate-limit');  // Import rate limiting middleware
const { body, validationResult } = require('express-validator');  // Import validation middleware

const app = express();  // Create Express application instance (W3Schools: Node.js Express)
const PORT = process.env.PORT || 3000;  // Set port from environment variable or default to 3000

// Security middleware - Helmet helps secure Express apps (W3Schools: Node.js Security)
app.use(helmet());  // Apply security headers

// CORS middleware - enables cross-origin requests (W3Schools: Node.js CORS)
app.use(cors({  // Configure CORS
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',  // Allow specific origin
  credentials: true,  // Allow credentials (cookies, authorization headers)
}));

// Rate limiting - prevents abuse by limiting requests (W3Schools: Node.js Rate Limiting)
const limiter = rateLimit({  // Create rate limiter
  windowMs: 15 * 60 * 1000,  // 15 minutes window
  max: 100,  // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',  // Error message
  standardHeaders: true,  // Return rate limit info in headers
  legacyHeaders: false,  // Disable legacy headers
});
app.use(limiter);  // Apply rate limiting to all routes

// Logging middleware - Morgan logs HTTP requests (W3Schools: Node.js Logging)
app.use(morgan('combined'));  // Use 'combined' format for detailed logs

// Body parsing middleware - parse JSON and URL-encoded bodies (W3Schools: Node.js Body Parsing)
app.use(express.json({ limit: '10mb' }));  // Parse JSON bodies with size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));  // Parse URL-encoded bodies

// Static files middleware - serve static files from 'public' directory (W3Schools: Node.js Static Files)
app.use(express.static('public'));  // Serve static files

// Database connection - connect to MongoDB using Mongoose (W3Schools: Node.js MongoDB)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taskmanager', {  // Connect to MongoDB
  useNewUrlParser: true,  // Use new URL parser (deprecated option but still used)
  useUnifiedTopology: true,  // Use new server discovery and monitoring engine
})
.then(() => console.log('✅ Connected to MongoDB'))  // Success message
.catch(err => {  // Error handling
  console.error('❌ MongoDB connection error:', err);  // Log error
  process.exit(1);  // Exit process on connection failure
});

// Handle MongoDB connection events (W3Schools: Node.js MongoDB Events)
mongoose.connection.on('disconnected', () => {  // Handle disconnection
  console.log('⚠️  MongoDB disconnected');  // Log disconnection
});

mongoose.connection.on('error', (err) => {  // Handle connection errors
  console.error('❌ MongoDB connection error:', err);  // Log error
});

// Mongoose schema definition - defines document structure (W3Schools: Node.js MongoDB Schema)
const taskSchema = new mongoose.Schema({  // Create schema for Task documents
  title: {  // Title field
    type: String,  // Data type
    required: [true, 'Task title is required'],  // Required with custom message
    trim: true,  // Remove whitespace
    maxlength: [100, 'Title cannot exceed 100 characters'],  // Maximum length
  },
  description: {  // Description field
    type: String,  // Data type
    maxlength: [500, 'Description cannot exceed 500 characters'],  // Maximum length
  },
  completed: {  // Completion status
    type: Boolean,  // Boolean type
    default: false,  // Default value
  },
  priority: {  // Priority level
    type: String,  // String type
    enum: ['low', 'medium', 'high'],  // Allowed values
    default: 'medium',  // Default value
  },
  dueDate: {  // Due date
    type: Date,  // Date type
    validate: {  // Custom validation
      validator: function(value) {  // Validation function
        return value > new Date();  // Must be future date
      },
      message: 'Due date must be in the future',  // Error message
    },
  },
  createdAt: {  // Creation timestamp
    type: Date,  // Date type
    default: Date.now,  // Default to current date
  },
  updatedAt: {  // Update timestamp
    type: Date,  // Date type
    default: Date.now,  // Default to current date
  },
});

// Pre-save middleware - update updatedAt before saving (W3Schools: Node.js MongoDB Middleware)
taskSchema.pre('save', function(next) {  // Pre-save hook
  this.updatedAt = new Date();  // Update timestamp
  next();  // Continue to save
});

// Instance method - calculate days until due (W3Schools: Node.js MongoDB Methods)
taskSchema.methods.getDaysUntilDue = function() {  // Instance method
  if (!this.dueDate) return null;  // Return null if no due date
  const today = new Date();  // Current date
  const diffTime = this.dueDate - today;  // Time difference
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));  // Convert to days
  return diffDays;  // Return days
};

// Static method - find tasks by priority (W3Schools: Node.js MongoDB Static Methods)
taskSchema.statics.findByPriority = function(priority) {  // Static method
  return this.find({ priority: priority });  // Find documents by priority
};

// Virtual property - is overdue (W3Schools: Node.js MongoDB Virtuals)
taskSchema.virtual('isOverdue').get(function() {  // Virtual getter
  if (!this.dueDate) return false;  // Not overdue if no due date
  return this.dueDate < new Date() && !this.completed;  // Overdue if past due and not completed
});

// Ensure virtual fields are serialized (W3Schools: Node.js MongoDB Virtuals)
taskSchema.set('toJSON', { virtuals: true });  // Include virtuals in JSON
taskSchema.set('toObject', { virtuals: true });  // Include virtuals in objects

// Create Mongoose model - provides interface to database (W3Schools: Node.js MongoDB Model)
const Task = mongoose.model('Task', taskSchema);  // Create Task model

// Validation middleware function (W3Schools: Node.js Validation)
const validateTask = [  // Array of validation rules
  body('title').isLength({ min: 1, max: 100 }).withMessage('Title must be 1-100 characters'),  // Title validation
  body('description').optional().isLength({ max: 500 }).withMessage('Description max 500 characters'),  // Description validation
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),  // Priority validation
  body('dueDate').optional().isISO8601().withMessage('Invalid date format'),  // Date validation
];

// Error handling middleware for validation (W3Schools: Node.js Error Handling)
const handleValidationErrors = (req, res, next) => {  // Middleware function
  const errors = validationResult(req);  // Get validation results
  if (!errors.isEmpty()) {  // Check for errors
    return res.status(400).json({  // Return 400 status
      success: false,  // Success flag
      errors: errors.array(),  // Error details
    });
  }
  next();  // Continue if no errors
};

// Async error handler wrapper (W3Schools: Node.js Async/Await)
const asyncHandler = (fn) => (req, res, next) => {  // Higher-order function
  Promise.resolve(fn(req, res, next)).catch(next);  // Wrap in promise and catch errors
};

// Routes

// GET /api/tasks - Retrieve all tasks (W3Schools: Node.js GET)
app.get('/api/tasks', asyncHandler(async (req, res) => {  // Async route handler
  const { priority, completed, sort = 'createdAt', order = 'desc' } = req.query;  // Extract query parameters

  // Build filter object
  let filter = {};  // Initialize filter
  if (priority) filter.priority = priority;  // Add priority filter
  if (completed !== undefined) filter.completed = completed === 'true';  // Add completion filter

  // Build sort object
  const sortOrder = order === 'asc' ? 1 : -1;  // Determine sort direction
  const sortOptions = {};  // Initialize sort options
  sortOptions[sort] = sortOrder;  // Set sort field and direction

  const tasks = await Task.find(filter).sort(sortOptions);  // Query database with filter and sort
  res.json({  // Send JSON response
    success: true,  // Success flag
    count: tasks.length,  // Number of tasks
    data: tasks,  // Task data
  });
}));

// GET /api/tasks/:id - Retrieve single task (W3Schools: Node.js GET with Params)
app.get('/api/tasks/:id', asyncHandler(async (req, res) => {  // Async route handler
  const task = await Task.findById(req.params.id);  // Find task by ID
  if (!task) {  // Check if task exists
    return res.status(404).json({  // Return 404 if not found
      success: false,  // Success flag
      message: 'Task not found',  // Error message
    });
  }
  res.json({  // Send JSON response
    success: true,  // Success flag
    data: task,  // Task data
  });
}));

// POST /api/tasks - Create new task (W3Schools: Node.js POST)
app.post('/api/tasks', validateTask, handleValidationErrors, asyncHandler(async (req, res) => {  // Route with validation
  const task = await Task.create(req.body);  // Create new task document
  res.status(201).json({  // Send 201 Created response
    success: true,  // Success flag
    data: task,  // Created task data
  });
}));

// PUT /api/tasks/:id - Update task (W3Schools: Node.js PUT)
app.put('/api/tasks/:id', validateTask, handleValidationErrors, asyncHandler(async (req, res) => {  // Route with validation
  let task = await Task.findById(req.params.id);  // Find existing task
  if (!task) {  // Check if task exists
    return res.status(404).json({  // Return 404 if not found
      success: false,  // Success flag
      message: 'Task not found',  // Error message
    });
  }

  task = await Task.findByIdAndUpdate(req.params.id, req.body, {  // Update task
    new: true,  // Return updated document
    runValidators: true,  // Run validation on update
  });

  res.json({  // Send JSON response
    success: true,  // Success flag
    data: task,  // Updated task data
  });
}));

// DELETE /api/tasks/:id - Delete task (W3Schools: Node.js DELETE)
app.delete('/api/tasks/:id', asyncHandler(async (req, res) => {  // Async route handler
  const task = await Task.findById(req.params.id);  // Find task to delete
  if (!task) {  // Check if task exists
    return res.status(404).json({  // Return 404 if not found
      success: false,  // Success flag
      message: 'Task not found',  // Error message
    });
  }

  await Task.findByIdAndDelete(req.params.id);  // Delete the task
  res.json({  // Send JSON response
    success: true,  // Success flag
    message: 'Task deleted successfully',  // Success message
  });
}));

// GET /api/tasks/stats - Get task statistics (W3Schools: Node.js Aggregation)
app.get('/api/tasks/stats', asyncHandler(async (req, res) => {  // Async route handler
  const stats = await Task.aggregate([  // MongoDB aggregation pipeline
    {  // Group stage
      \$group: {  // Group documents
        _id: null,  // Group all documents
        totalTasks: { \$sum: 1 },  // Count total tasks
        completedTasks: {  // Count completed tasks
          \$sum: { \$cond: [{ \$eq: ['$completed', true] }, 1, 0] }  // Conditional sum
        },
        pendingTasks: {  // Count pending tasks
          \$sum: { \$cond: [{ \$eq: ['$completed', false] }, 1, 0] }  // Conditional sum
        },
        highPriorityTasks: {  // Count high priority tasks
          \$sum: { \$cond: [{ \$eq: ['$priority', 'high'] }, 1, 0] }  // Conditional sum
        },
      }
    }
  ]);

  const result = stats[0] || { totalTasks: 0, completedTasks: 0, pendingTasks: 0, highPriorityTasks: 0 };  // Default values
  result.completionRate = result.totalTasks > 0 ? Math.round((result.completedTasks / result.totalTasks) * 100) : 0;  // Calculate rate

  res.json({  // Send JSON response
    success: true,  // Success flag
    data: result,  // Statistics data
  });
}));

// Global error handling middleware (W3Schools: Node.js Error Handling)
app.use((err, req, res, next) => {  // Error handling middleware
  console.error('Error:', err);  // Log error

  // Mongoose validation error
  if (err.name === 'ValidationError') {  // Check error type
    const errors = Object.values(err.errors).map(e => e.message);  // Extract error messages
    return res.status(400).json({  // Return 400 status
      success: false,  // Success flag
      message: 'Validation Error',  // Error message
      errors,  // Error details
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {  // Check error type
    return res.status(400).json({  // Return 400 status
      success: false,  // Success flag
      message: 'Invalid ID format',  // Error message
    });
  }

  // Default error response
  res.status(500).json({  // Return 500 status
    success: false,  // Success flag
    message: 'Internal Server Error',  // Error message
  });
});

// 404 handler - handle undefined routes (W3Schools: Node.js 404 Handler)
app.use('*', (req, res) => {  // Catch-all route
  res.status(404).json({  // Return 404 status
    success: false,  // Success flag
    message: 'Route not found',  // Error message
  });
});

// Graceful shutdown handling (W3Schools: Node.js Process)
process.on('SIGINT', async () => {  // Handle SIGINT (Ctrl+C)
  console.log('🛑 Received SIGINT, shutting down gracefully...');  // Log shutdown
  await mongoose.connection.close();  // Close database connection
  process.exit(0);  // Exit process
});

process.on('SIGTERM', async () => {  // Handle SIGTERM
  console.log('🛑 Received SIGTERM, shutting down gracefully...');  // Log shutdown
  await mongoose.connection.close();  // Close database connection
  process.exit(0);  // Exit process
});

// Start server (W3Schools: Node.js Server)
app.listen(PORT, () => {  // Start listening on port
  console.log(\`🚀 Server running on port \${PORT}\`);  // Log server start
  console.log(\`📚 API Documentation: http://localhost:\${PORT}/api/docs\`);  // Log API docs URL
});`;
  }
  if (/(html)/i.test(lower)) {
    return `<!DOCTYPE html>  <!-- Document type declaration - tells browser this is HTML5 (W3Schools: HTML Doctypes) -->
<html lang="en">  <!-- HTML root element with lang attribute for accessibility (W3Schools: HTML lang Attribute) -->
<head>  <!-- Head section contains metadata and links to external resources -->
    <meta charset="UTF-8">  <!-- Character encoding declaration - supports all characters (W3Schools: HTML UTF-8) -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0">  <!-- Responsive design viewport (W3Schools: HTML Viewport) -->
    <meta name="description" content="Modern HTML5 webpage with semantic elements and best practices">  <!-- SEO description (W3Schools: HTML Meta) -->
    <meta name="keywords" content="HTML5, semantic, responsive, web development">  <!-- SEO keywords -->
    <meta name="author" content="AI Search Engine">  <!-- Author information -->
    <meta name="robots" content="index, follow">  <!-- Search engine crawling instructions -->
    <title>Modern HTML5 Webpage - W3Schools Best Practices</title>  <!-- Page title in browser tab (W3Schools: HTML Title) -->
    <link rel="icon" href="favicon.ico" type="image/x-icon">  <!-- Favicon link -->
    <link rel="stylesheet" href="styles.css">  <!-- External CSS stylesheet link (W3Schools: HTML Links) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">  <!-- Preconnect for performance -->
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>  <!-- Preconnect with crossorigin -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">  <!-- Google Fonts -->
</head>
<body>  <!-- Body element contains all visible content (W3Schools: HTML Body) -->
    <!-- Skip link for accessibility - allows keyboard users to skip navigation (W3Schools: HTML Accessibility) -->
    <a href="#main-content" class="skip-link">Skip to main content</a>

    <header role="banner">  <!-- Header with ARIA role for screen readers (W3Schools: HTML ARIA) -->
        <nav role="navigation" aria-label="Main navigation">  <!-- Navigation with ARIA label -->
            <div class="nav-container">  <!-- Container for navigation layout -->
                <div class="logo">  <!-- Logo container -->
                    <a href="/" aria-label="Home page">  <!-- Link with accessibility label -->
                        <img src="logo.svg" alt="Company Logo" width="40" height="40">  <!-- Logo image with alt text -->
                        <span class="site-name">AI Search</span>  <!-- Site name text -->
                    </a>
                </div>
                <ul class="nav-menu">  <!-- Unordered list for navigation menu (W3Schools: HTML Lists) -->
                    <li><a href="#home" class="nav-link">Home</a></li>  <!-- List item with anchor link -->
                    <li><a href="#about" class="nav-link">About</a></li>  <!-- Navigation link -->
                    <li><a href="#services" class="nav-link">Services</a></li>  <!-- Navigation link -->
                    <li><a href="#contact" class="nav-link">Contact</a></li>  <!-- Navigation link -->
                </ul>
                <button class="mobile-menu-toggle" aria-expanded="false" aria-label="Toggle navigation menu">  <!-- Mobile menu button -->
                    <span class="hamburger"></span>  <!-- Hamburger icon -->
                </button>
            </div>
        </nav>
    </header>

    <main id="main-content" role="main">  <!-- Main content area with ID and ARIA role (W3Schools: HTML Main) -->
        <section id="home" class="hero-section" aria-labelledby="hero-heading">  <!-- Section with ARIA labelledby -->
            <div class="hero-container">  <!-- Container for hero content -->
                <h1 id="hero-heading">Welcome to Modern Web Development</h1>  <!-- Main heading with ID (W3Schools: HTML Headings) -->
                <p class="hero-subtitle">Building the future of the web with HTML5, CSS3, and JavaScript</p>  <!-- Subtitle paragraph -->
                <div class="hero-actions">  <!-- Action buttons container -->
                    <a href="#services" class="btn btn-primary">Explore Services</a>  <!-- Primary call-to-action -->
                    <a href="#contact" class="btn btn-secondary">Get Started</a>  <!-- Secondary call-to-action -->
                </div>
                <div class="hero-stats">  <!-- Statistics section -->
                    <div class="stat-item">  <!-- Individual statistic -->
                        <span class="stat-number">10K+</span>  <!-- Statistic number -->
                        <span class="stat-label">Happy Users</span>  <!-- Statistic label -->
                    </div>
                    <div class="stat-item">  <!-- Individual statistic -->
                        <span class="stat-number">500+</span>  <!-- Statistic number -->
                        <span class="stat-label">Projects</span>  <!-- Statistic label -->
                    </div>
                    <div class="stat-item">  <!-- Individual statistic -->
                        <span class="stat-number">99%</span>  <!-- Statistic number -->
                        <span class="stat-label">Uptime</span>  <!-- Statistic label -->
                    </div>
                </div>
            </div>
        </section>

        <section id="about" class="about-section" aria-labelledby="about-heading">  <!-- About section -->
            <div class="container">  <!-- Content container -->
                <div class="section-header">  <!-- Section header -->
                    <h2 id="about-heading">About Our Company</h2>  <!-- Section heading -->
                    <p class="section-subtitle">Learn more about our mission and values</p>  <!-- Section subtitle -->
                </div>
                <div class="about-content">  <!-- About content grid -->
                    <div class="about-text">  <!-- Text content -->
                        <h3>Our Story</h3>  <!-- Subsection heading -->
                        <p>We are passionate about creating exceptional web experiences using modern technologies and best practices from W3Schools.</p>
                        <p>Our team combines creativity with technical expertise to deliver solutions that not only look great but also perform exceptionally well.</p>
                        <ul class="features-list">  <!-- Features list -->
                            <li>✅ Semantic HTML5 markup</li>  <!-- List item with checkmark -->
                            <li>✅ Responsive design principles</li>  <!-- List item -->
                            <li>✅ Accessibility-first approach</li>  <!-- List item -->
                            <li>✅ Performance optimization</li>  <!-- List item -->
                        </ul>
                    </div>
                    <div class="about-image">  <!-- Image content -->
                        <figure>  <!-- Figure element for image with caption (W3Schools: HTML Figures) -->
                            <img src="team-photo.jpg" alt="Our development team collaborating" loading="lazy" width="500" height="300">  <!-- Image with lazy loading -->
                            <figcaption>The AI Search team working together</figcaption>  <!-- Image caption -->
                        </figure>
                    </div>
                </div>
            </div>
        </section>

        <section id="services" class="services-section" aria-labelledby="services-heading">  <!-- Services section -->
            <div class="container">  <!-- Content container -->
                <div class="section-header">  <!-- Section header -->
                    <h2 id="services-heading">Our Services</h2>  <!-- Section heading -->
                    <p class="section-subtitle">Comprehensive web development solutions</p>  <!-- Section subtitle -->
                </div>
                <div class="services-grid">  <!-- Services grid layout -->
                    <article class="service-card">  <!-- Service card using article element (W3Schools: HTML Articles) -->
                        <div class="service-icon">🌐</div>  <!-- Service icon -->
                        <h3>Web Development</h3>  <!-- Service title -->
                        <p>Custom website development using HTML5, CSS3, and modern JavaScript frameworks.</p>  <!-- Service description -->
                        <a href="#contact" class="service-link">Learn More →</a>  <!-- Service link -->
                    </article>
                    <article class="service-card">  <!-- Service card -->
                        <div class="service-icon">📱</div>  <!-- Service icon -->
                        <h3>Mobile Apps</h3>  <!-- Service title -->
                        <p>Cross-platform mobile applications built with React Native and Flutter.</p>  <!-- Service description -->
                        <a href="#contact" class="service-link">Learn More →</a>  <!-- Service link -->
                    </article>
                    <article class="service-card">  <!-- Service card -->
                        <div class="service-icon">⚡</div>  <!-- Service icon -->
                        <h3>Performance</h3>  <!-- Service title -->
                        <p>Website optimization for speed, SEO, and user experience improvements.</p>  <!-- Service description -->
                        <a href="#contact" class="service-link">Learn More →</a>  <!-- Service link -->
                    </article>
                </div>
            </div>
        </section>

        <section id="testimonials" class="testimonials-section" aria-labelledby="testimonials-heading">  <!-- Testimonials section -->
            <div class="container">  <!-- Content container -->
                <div class="section-header">  <!-- Section header -->
                    <h2 id="testimonials-heading">What Our Clients Say</h2>  <!-- Section heading -->
                </div>
                <div class="testimonials-grid">  <!-- Testimonials grid -->
                    <blockquote class="testimonial">  <!-- Blockquote for testimonial (W3Schools: HTML Blockquote) -->
                        <p>"Exceptional work! The team's attention to detail and use of modern web standards is outstanding."</p>
                        <cite>  <!-- Cite element for attribution (W3Schools: HTML Cite) -->
                            <span class="client-name">Sarah Johnson</span>  <!-- Client name -->
                            <span class="client-title">CEO, TechCorp</span>  <!-- Client title -->
                        </cite>
                    </blockquote>
                    <blockquote class="testimonial">  <!-- Testimonial -->
                        <p>"Their HTML5 and CSS3 expertise transformed our outdated website into a modern, accessible platform."</p>
                        <cite>  <!-- Attribution -->
                            <span class="client-name">Mike Chen</span>  <!-- Client name -->
                            <span class="client-title">CTO, InnovateLabs</span>  <!-- Client title -->
                        </cite>
                    </blockquote>
                </div>
            </div>
        </section>

        <section id="contact" class="contact-section" aria-labelledby="contact-heading">  <!-- Contact section -->
            <div class="container">  <!-- Content container -->
                <div class="section-header">  <!-- Section header -->
                    <h2 id="contact-heading">Get In Touch</h2>  <!-- Section heading -->
                    <p class="section-subtitle">Ready to start your next project?</p>  <!-- Section subtitle -->
                </div>
                <div class="contact-content">  <!-- Contact content -->
                    <div class="contact-info">  <!-- Contact information -->
                        <div class="contact-item">  <!-- Contact item -->
                            <h3>📧 Email</h3>  <!-- Contact type -->
                            <p><a href="mailto:hello@aisearch.com">hello@aisearch.com</a></p>  <!-- Email link -->
                        </div>
                        <div class="contact-item">  <!-- Contact item -->
                            <h3>📞 Phone</h3>  <!-- Contact type -->
                            <p><a href="tel:+1234567890">+1 (234) 567-8900</a></p>  <!-- Phone link -->
                        </div>
                        <div class="contact-item">  <!-- Contact item -->
                            <h3>📍 Office</h3>  <!-- Contact type -->
                            <address>  <!-- Address element (W3Schools: HTML Address) -->
                                123 Tech Street<br>  <!-- Line break -->
                                San Francisco, CA 94105<br>  <!-- City and state -->
                                United States  <!-- Country -->
                            </address>
                        </div>
                    </div>
                    <form class="contact-form" action="/submit-contact" method="post" aria-labelledby="contact-form-heading">  <!-- Contact form -->
                        <h3 id="contact-form-heading">Send us a message</h3>  <!-- Form heading -->
                        <div class="form-group">  <!-- Form group -->
                            <label for="name">Full Name *</label>  <!-- Label with for attribute (W3Schools: HTML Labels) -->
                            <input type="text" id="name" name="name" required aria-describedby="name-help">  <!-- Input with accessibility -->
                            <span id="name-help" class="help-text">Enter your full name</span>  <!-- Help text -->
                        </div>
                        <div class="form-group">  <!-- Form group -->
                            <label for="email">Email Address *</label>  <!-- Label -->
                            <input type="email" id="email" name="email" required aria-describedby="email-help">  <!-- Email input -->
                            <span id="email-help" class="help-text">We'll never share your email</span>  <!-- Help text -->
                        </div>
                        <div class="form-group">  <!-- Form group -->
                            <label for="subject">Subject</label>  <!-- Label -->
                            <select id="subject" name="subject" aria-describedby="subject-help">  <!-- Select dropdown -->
                                <option value="">Choose a subject</option>  <!-- Default option -->
                                <option value="web-development">Web Development</option>  <!-- Option -->
                                <option value="mobile-apps">Mobile Apps</option>  <!-- Option -->
                                <option value="consulting">Consulting</option>  <!-- Option -->
                                <option value="other">Other</option>  <!-- Option -->
                            </select>
                            <span id="subject-help" class="help-text">Select the topic of your inquiry</span>  <!-- Help text -->
                        </div>
                        <div class="form-group">  <!-- Form group -->
                            <label for="message">Message *</label>  <!-- Label -->
                            <textarea id="message" name="message" rows="5" required aria-describedby="message-help" maxlength="1000"></textarea>  <!-- Textarea -->
                            <span id="message-help" class="help-text">Tell us about your project (max 1000 characters)</span>  <!-- Help text -->
                        </div>
                        <div class="form-group">  <!-- Form group -->
                            <label class="checkbox-label">  <!-- Checkbox label -->
                                <input type="checkbox" name="newsletter" value="yes">  <!-- Checkbox input -->
                                Subscribe to our newsletter  <!-- Label text -->
                            </label>
                        </div>
                        <button type="submit" class="btn btn-primary">Send Message</button>  <!-- Submit button -->
                    </form>
                </div>
            </div>
        </section>
    </main>

    <footer role="contentinfo">  <!-- Footer with ARIA role (W3Schools: HTML Footer) -->
        <div class="container">  <!-- Footer container -->
            <div class="footer-content">  <!-- Footer content -->
                <div class="footer-section">  <!-- Footer section -->
                    <h3>AI Search</h3>  <!-- Footer heading -->
                    <p>Building the future of web development with modern technologies and W3Schools best practices.</p>  <!-- Footer description -->
                    <div class="social-links">  <!-- Social media links -->
                        <a href="https://twitter.com/aisearch" aria-label="Follow us on Twitter">🐦</a>  <!-- Twitter link -->
                        <a href="https://linkedin.com/company/aisearch" aria-label="Connect on LinkedIn">💼</a>  <!-- LinkedIn link -->
                        <a href="https://github.com/aisearch" aria-label="View our GitHub">🐙</a>  <!-- GitHub link -->
                    </div>
                </div>
                <div class="footer-section">  <!-- Footer section -->
                    <h4>Quick Links</h4>  <!-- Section heading -->
                    <ul>  <!-- Footer navigation -->
                        <li><a href="#home">Home</a></li>  <!-- Footer link -->
                        <li><a href="#about">About</a></li>  <!-- Footer link -->
                        <li><a href="#services">Services</a></li>  <!-- Footer link -->
                        <li><a href="#contact">Contact</a></li>  <!-- Footer link -->
                    </ul>
                </div>
                <div class="footer-section">  <!-- Footer section -->
                    <h4>Resources</h4>  <!-- Section heading -->
                    <ul>  <!-- Resource links -->
                        <li><a href="https://www.w3schools.com/html/" target="_blank" rel="noopener">HTML Tutorial</a></li>  <!-- W3Schools link -->
                        <li><a href="https://www.w3schools.com/css/" target="_blank" rel="noopener">CSS Tutorial</a></li>  <!-- W3Schools link -->
                        <li><a href="https://www.w3schools.com/js/" target="_blank" rel="noopener">JavaScript Tutorial</a></li>  <!-- W3Schools link -->
                        <li><a href="/blog">Blog</a></li>  <!-- Blog link -->
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">  <!-- Footer bottom -->
                <p>&copy; <time datetime="2024">2024</time> AI Search. All rights reserved.</p>  <!-- Copyright with time element -->
                <div class="footer-links">  <!-- Footer links -->
                    <a href="/privacy">Privacy Policy</a> |  <!-- Privacy link -->
                    <a href="/terms">Terms of Service</a> |  <!-- Terms link -->
                    <a href="/accessibility">Accessibility</a>  <!-- Accessibility link -->
                </div>
            </div>
        </div>
    </footer>

    <!-- Modal dialog for mobile menu (W3Schools: HTML Dialog) -->
    <dialog id="mobile-menu" class="mobile-menu-modal">  <!-- Dialog element -->
        <div class="modal-content">  <!-- Modal content -->
            <button class="modal-close" aria-label="Close menu">×</button>  <!-- Close button -->
            <nav>  <!-- Navigation in modal -->
                <ul class="mobile-nav-menu">  <!-- Mobile navigation menu -->
                    <li><a href="#home">Home</a></li>  <!-- Mobile menu item -->
                    <li><a href="#about">About</a></li>  <!-- Mobile menu item -->
                    <li><a href="#services">Services</a></li>  <!-- Mobile menu item -->
                    <li><a href="#contact">Contact</a></li>  <!-- Mobile menu item -->
                </ul>
            </nav>
        </div>
    </dialog>

    <!-- External JavaScript files -->
    <script src="https://www.w3schools.com/lib/w3.js"></script>  <!-- W3Schools library -->
    <script src="script.js" defer></script>  <!-- Main JavaScript file with defer -->
    <noscript>  <!-- Fallback for users without JavaScript (W3Schools: HTML Noscript) -->
        <div class="noscript-message">
            <p>This website requires JavaScript to function properly. Please enable JavaScript in your browser settings.</p>
        </div>
    </noscript>
</body>
</html>`;
  }
  if (/(css|stylesheet)/i.test(lower)) {
    return `/* CSS: Modern Responsive Design with Grid and Flexbox */
/* W3Schools CSS Tutorial: https://www.w3schools.com/css/ */
/* This stylesheet demonstrates modern CSS techniques for responsive web design */

/* CSS Reset and Base Styles - Establishing consistent baseline (W3Schools: CSS Reset) */
* {  /* Universal selector - applies to all elements */
  margin: 0;  /* Remove default margins */
  padding: 0;  /* Remove default padding */
  box-sizing: border-box;  /* Include padding and border in element's total width and height (W3Schools: CSS Box Model) */
}

html {  /* HTML element styles */
  scroll-behavior: smooth;  /* Smooth scrolling for anchor links (W3Schools: CSS Scroll) */
  font-size: 16px;  /* Base font size for rem calculations */
}

body {  /* Body element - main document styling */
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;  /* Font stack with fallbacks (W3Schools: CSS Fonts) */
  line-height: 1.6;  /* Line height for readability (W3Schools: CSS Line Height) */
  color: #333;  /* Text color using hex notation (W3Schools: CSS Colors) */
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);  /* Gradient background (W3Schools: CSS Gradients) */
  min-height: 100vh;  /* Minimum height of viewport (W3Schools: CSS Units) */
}

/* CSS Custom Properties (Variables) - Reusable values (W3Schools: CSS Variables) */
:root {  /* Root selector for global CSS variables */
  --primary-color: #667eea;  /* Primary brand color */
  --secondary-color: #764ba2;  /* Secondary brand color */
  --text-color: #333;  /* Main text color */
  --background-color: #ffffff;  /* Background color */
  --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);  /* Box shadow value */
  --border-radius: 8px;  /* Border radius for consistency */
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);  /* Smooth transition timing (W3Schools: CSS Transitions) */
}

/* Skip Link - Accessibility feature (W3Schools: CSS Accessibility) */
.skip-link {  /* Skip navigation link for screen readers */
  position: absolute;  /* Position absolutely */
  top: -40px;  /* Hide off-screen initially */
  left: 6px;  /* Left position */
  background: var(--primary-color);  /* Use CSS variable */
  color: white;  /* White text */
  padding: 8px;  /* Padding */
  text-decoration: none;  /* Remove underline */
  border-radius: var(--border-radius);  /* Use CSS variable */
  z-index: 1000;  /* High z-index */
  transition: var(--transition);  /* Smooth transition */
}

.skip-link:focus {  /* Focus state for keyboard navigation */
  top: 6px;  /* Show when focused */
}

/* Header and Navigation Styles */
header {  /* Header element */
  background: rgba(255, 255, 255, 0.95);  /* Semi-transparent white background */
  backdrop-filter: blur(10px);  /* Blur effect (modern browsers) (W3Schools: CSS Filters) */
  box-shadow: var(--shadow);  /* Use CSS variable for shadow */
  position: sticky;  /* Sticky positioning (W3Schools: CSS Position) */
  top: 0;  /* Stick to top */
  z-index: 100;  /* High z-index */
}

.nav-container {  /* Navigation container */
  max-width: 1200px;  /* Maximum width */
  margin: 0 auto;  /* Center horizontally */
  padding: 0 2rem;  /* Horizontal padding */
  display: flex;  /* Flexbox layout (W3Schools: CSS Flexbox) */
  justify-content: space-between;  /* Space between items */
  align-items: center;  /* Vertical alignment */
  height: 70px;  /* Fixed height */
}

.logo {  /* Logo container */
  display: flex;  /* Flexbox */
  align-items: center;  /* Center vertically */
  gap: 0.5rem;  /* Gap between items */
}

.logo img {  /* Logo image */
  width: 40px;  /* Fixed width */
  height: 40px;  /* Fixed height */
}

.site-name {  /* Site name text */
  font-size: 1.5rem;  /* Font size */
  font-weight: 600;  /* Font weight */
  color: var(--primary-color);  /* Use CSS variable */
}

.nav-menu {  /* Navigation menu */
  display: flex;  /* Flexbox layout */
  list-style: none;  /* Remove bullet points */
  gap: 2rem;  /* Gap between items */
}

.nav-link {  /* Navigation links */
  text-decoration: none;  /* Remove underline */
  color: var(--text-color);  /* Text color */
  font-weight: 500;  /* Font weight */
  transition: var(--transition);  /* Smooth transition */
  position: relative;  /* For pseudo-element positioning */
}

.nav-link::after {  /* Pseudo-element for underline effect */
  content: '';  /* Empty content */
  position: absolute;  /* Absolute positioning */
  width: 0;  /* Initial width */
  height: 2px;  /* Height of underline */
  bottom: -5px;  /* Position below text */
  left: 0;  /* Start from left */
  background: var(--primary-color);  /* Background color */
  transition: width 0.3s ease;  /* Width transition */
}

.nav-link:hover::after {  /* Hover state for underline */
  width: 100%;  /* Full width on hover */
}

.mobile-menu-toggle {  /* Mobile menu toggle button */
  display: none;  /* Hidden on desktop */
  background: none;  /* No background */
  border: none;  /* No border */
  cursor: pointer;  /* Pointer cursor */
  padding: 0.5rem;  /* Padding */
}

.hamburger {  /* Hamburger icon */
  display: block;  /* Block display */
  width: 25px;  /* Width */
  height: 3px;  /* Height */
  background: var(--text-color);  /* Background color */
  position: relative;  /* For pseudo-elements */
}

.hamburger::before,  /* Before pseudo-element */
.hamburger::after {  /* After pseudo-element */
  content: '';  /* Empty content */
  display: block;  /* Block display */
  width: 25px;  /* Width */
  height: 3px;  /* Height */
  background: var(--text-color);  /* Background color */
  position: absolute;  /* Absolute positioning */
  transition: var(--transition);  /* Smooth transition */
}

.hamburger::before { top: -8px; }  /* Position before pseudo-element */
.hamburger::after { top: 8px; }  /* Position after pseudo-element */

/* Main Content Styles */
main {  /* Main content area */
  max-width: 1200px;  /* Maximum width */
  margin: 0 auto;  /* Center horizontally */
  padding: 2rem;  /* Padding */
}

section {  /* Section elements */
  margin-bottom: 4rem;  /* Bottom margin */
  padding: 3rem 0;  /* Vertical padding */
}

.hero-section {  /* Hero section */
  text-align: center;  /* Center text */
  color: white;  /* White text */
  padding: 6rem 2rem;  /* Padding */
}

.hero-container {  /* Hero content container */
  max-width: 800px;  /* Maximum width */
  margin: 0 auto;  /* Center */
}

#hero-heading {  /* Hero heading */
  font-size: clamp(2.5rem, 5vw, 4rem);  /* Fluid typography (W3Schools: CSS Clamp) */
  font-weight: 700;  /* Bold weight */
  margin-bottom: 1rem;  /* Bottom margin */
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);  /* Text shadow */
}

.hero-subtitle {  /* Hero subtitle */
  font-size: 1.25rem;  /* Font size */
  margin-bottom: 2rem;  /* Bottom margin */
  opacity: 0.9;  /* Slight transparency */
}

.hero-actions {  /* Hero action buttons */
  display: flex;  /* Flexbox */
  gap: 1rem;  /* Gap between buttons */
  justify-content: center;  /* Center horizontally */
  margin-bottom: 3rem;  /* Bottom margin */
  flex-wrap: wrap;  /* Wrap on small screens */
}

.btn {  /* Base button styles */
  display: inline-block;  /* Inline block */
  padding: 1rem 2rem;  /* Padding */
  border-radius: var(--border-radius);  /* Border radius */
  text-decoration: none;  /* Remove underline */
  font-weight: 600;  /* Font weight */
  transition: var(--transition);  /* Smooth transition */
  cursor: pointer;  /* Pointer cursor */
  border: 2px solid transparent;  /* Transparent border for hover effect */
}

.btn-primary {  /* Primary button */
  background: var(--primary-color);  /* Primary background */
  color: white;  /* White text */
}

.btn-primary:hover {  /* Primary button hover */
  background: transparent;  /* Transparent background */
  border-color: white;  /* White border */
  transform: translateY(-2px);  /* Lift effect (W3Schools: CSS Transform) */
}

.btn-secondary {  /* Secondary button */
  background: transparent;  /* Transparent background */
  color: white;  /* White text */
  border: 2px solid white;  /* White border */
}

.btn-secondary:hover {  /* Secondary button hover */
  background: white;  /* White background */
  color: var(--primary-color);  /* Primary text color */
}

.hero-stats {  /* Hero statistics */
  display: grid;  /* CSS Grid layout (W3Schools: CSS Grid) */
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));  /* Responsive grid */
  gap: 2rem;  /* Gap between items */
  margin-top: 3rem;  /* Top margin */
}

.stat-item {  /* Individual statistic */
  text-align: center;  /* Center text */
}

.stat-number {  /* Statistic number */
  display: block;  /* Block display */
  font-size: 2.5rem;  /* Large font */
  font-weight: 700;  /* Bold */
  margin-bottom: 0.5rem;  /* Bottom margin */
}

.stat-label {  /* Statistic label */
  font-size: 0.9rem;  /* Small font */
  opacity: 0.8;  /* Slight transparency */
}

/* Container and Layout Styles */
.container {  /* Content container */
  max-width: 1200px;  /* Maximum width */
  margin: 0 auto;  /* Center horizontally */
  padding: 0 2rem;  /* Horizontal padding */
}

.section-header {  /* Section header */
  text-align: center;  /* Center text */
  margin-bottom: 3rem;  /* Bottom margin */
}

.section-header h2 {  /* Section heading */
  font-size: 2.5rem;  /* Font size */
  margin-bottom: 1rem;  /* Bottom margin */
  color: var(--text-color);  /* Text color */
}

.section-subtitle {  /* Section subtitle */
  font-size: 1.1rem;  /* Font size */
  color: #666;  /* Grey color */
  max-width: 600px;  /* Maximum width */
  margin: 0 auto;  /* Center */
}

/* About Section Styles */
.about-content {  /* About content layout */
  display: grid;  /* CSS Grid */
  grid-template-columns: 2fr 1fr;  /* Two column grid */
  gap: 3rem;  /* Gap between columns */
  align-items: start;  /* Align to start */
}

.about-text h3 {  /* About subsection heading */
  font-size: 1.5rem;  /* Font size */
  margin-bottom: 1rem;  /* Bottom margin */
  color: var(--primary-color);  /* Primary color */
}

.features-list {  /* Features list */
  list-style: none;  /* Remove bullets */
  padding: 0;  /* Remove padding */
}

.features-list li {  /* List items */
  padding: 0.5rem 0;  /* Vertical padding */
  display: flex;  /* Flexbox */
  align-items: center;  /* Center vertically */
  gap: 0.5rem;  /* Gap */
}

.about-image img {  /* About image */
  width: 100%;  /* Full width */
  height: auto;  /* Maintain aspect ratio */
  border-radius: var(--border-radius);  /* Border radius */
  box-shadow: var(--shadow);  /* Shadow */
}

.about-image figcaption {  /* Image caption */
  text-align: center;  /* Center text */
  margin-top: 1rem;  /* Top margin */
  font-style: italic;  /* Italic style */
  color: #666;  /* Grey color */
}

/* Services Section Styles */
.services-grid {  /* Services grid */
  display: grid;  /* CSS Grid */
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));  /* Responsive grid */
  gap: 2rem;  /* Gap between items */
}

.service-card {  /* Service card */
  background: var(--background-color);  /* White background */
  padding: 2rem;  /* Padding */
  border-radius: var(--border-radius);  /* Border radius */
  box-shadow: var(--shadow);  /* Shadow */
  transition: var(--transition);  /* Smooth transition */
  text-align: center;  /* Center text */
}

.service-card:hover {  /* Hover effect */
  transform: translateY(-5px);  /* Lift effect */
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);  /* Enhanced shadow */
}

.service-icon {  /* Service icon */
  font-size: 3rem;  /* Large font */
  margin-bottom: 1rem;  /* Bottom margin */
}

.service-card h3 {  /* Service title */
  margin-bottom: 1rem;  /* Bottom margin */
  color: var(--primary-color);  /* Primary color */
}

.service-link {  /* Service link */
  color: var(--primary-color);  /* Primary color */
  text-decoration: none;  /* Remove underline */
  font-weight: 600;  /* Font weight */
  display: inline-block;  /* Inline block */
  margin-top: 1rem;  /* Top margin */
  transition: var(--transition);  /* Smooth transition */
}

.service-link:hover {  /* Link hover */
  transform: translateX(5px);  /* Slide effect */
}

/* Testimonials Section Styles */
.testimonials-grid {  /* Testimonials grid */
  display: grid;  /* CSS Grid */
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));  /* Responsive grid */
  gap: 2rem;  /* Gap */
}

.testimonial {  /* Testimonial card */
  background: var(--background-color);  /* White background */
  padding: 2rem;  /* Padding */
  border-radius: var(--border-radius);  /* Border radius */
  box-shadow: var(--shadow);  /* Shadow */
  border-left: 4px solid var(--primary-color);  /* Left border accent */
}

.testimonial p {  /* Testimonial text */
  font-size: 1.1rem;  /* Font size */
  font-style: italic;  /* Italic style */
  margin-bottom: 1.5rem;  /* Bottom margin */
  color: var(--text-color);  /* Text color */
}

.testimonial cite {  /* Citation */
  display: block;  /* Block display */
  text-align: right;  /* Right align */
}

.client-name {  /* Client name */
  display: block;  /* Block display */
  font-weight: 600;  /* Font weight */
  color: var(--primary-color);  /* Primary color */
}

.client-title {  /* Client title */
  display: block;  /* Block display */
  font-size: 0.9rem;  /* Small font */
  color: #666;  /* Grey color */
}

/* Contact Section Styles */
.contact-content {  /* Contact content layout */
  display: grid;  /* CSS Grid */
  grid-template-columns: 1fr 2fr;  /* Two column grid */
  gap: 3rem;  /* Gap */
}

.contact-info {  /* Contact information */
  display: flex;  /* Flexbox */
  flex-direction: column;  /* Vertical stacking */
  gap: 2rem;  /* Gap */
}

.contact-item h3 {  /* Contact item heading */
  margin-bottom: 0.5rem;  /* Bottom margin */
  color: var(--primary-color);  /* Primary color */
}

.contact-item p {  /* Contact item text */
  margin: 0;  /* Remove margin */
}

.contact-item a {  /* Contact links */
  color: var(--text-color);  /* Text color */
  text-decoration: none;  /* Remove underline */
  transition: var(--transition);  /* Smooth transition */
}

.contact-item a:hover {  /* Link hover */
  color: var(--primary-color);  /* Primary color */
}

.contact-form {  /* Contact form */
  background: var(--background-color);  /* White background */
  padding: 2rem;  /* Padding */
  border-radius: var(--border-radius);  /* Border radius */
  box-shadow: var(--shadow);  /* Shadow */
}

.contact-form h3 {  /* Form heading */
  margin-bottom: 2rem;  /* Bottom margin */
  text-align: center;  /* Center text */
  color: var(--primary-color);  /* Primary color */
}

.form-group {  /* Form group */
  margin-bottom: 1.5rem;  /* Bottom margin */
}

.form-group label {  /* Form labels */
  display: block;  /* Block display */
  margin-bottom: 0.5rem;  /* Bottom margin */
  font-weight: 600;  /* Font weight */
  color: var(--text-color);  /* Text color */
}

.form-group input,  /* Form inputs */
.form-group textarea,  /* Textarea */
.form-group select {  /* Select dropdown */
  width: 100%;  /* Full width */
  padding: 0.75rem;  /* Padding */
  border: 2px solid #e1e5e9;  /* Border */
  border-radius: var(--border-radius);  /* Border radius */
  font-size: 1rem;  /* Font size */
  transition: var(--transition);  /* Smooth transition */
  font-family: inherit;  /* Inherit font family */
}

.form-group input:focus,  /* Focus state */
.form-group textarea:focus,  /* Focus state */
.form-group select:focus {  /* Focus state */
  outline: none;  /* Remove outline */
  border-color: var(--primary-color);  /* Primary border */
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);  /* Focus ring */
}

.help-text {  /* Help text */
  display: block;  /* Block display */
  margin-top: 0.25rem;  /* Top margin */
  font-size: 0.875rem;  /* Small font */
  color: #666;  /* Grey color */
}

.checkbox-label {  /* Checkbox label */
  display: flex;  /* Flexbox */
  align-items: center;  /* Center vertically */
  gap: 0.5rem;  /* Gap */
  cursor: pointer;  /* Pointer cursor */
}

.checkbox-label input[type="checkbox"] {  /* Checkbox input */
  width: auto;  /* Auto width */
  margin: 0;  /* Remove margin */
}

/* Footer Styles */
footer {  /* Footer element */
  background: var(--text-color);  /* Dark background */
  color: white;  /* White text */
  padding: 3rem 0 1rem;  /* Padding */
  margin-top: 4rem;  /* Top margin */
}

.footer-content {  /* Footer content */
  display: grid;  /* CSS Grid */
  grid-template-columns: 2fr 1fr 1fr;  /* Three column grid */
  gap: 3rem;  /* Gap */
  margin-bottom: 2rem;  /* Bottom margin */
}

.footer-section h3 {  /* Footer section heading */
  margin-bottom: 1rem;  /* Bottom margin */
  color: white;  /* White color */
}

.footer-section h4 {  /* Footer subsection heading */
  margin-bottom: 1rem;  /* Bottom margin */
  color: white;  /* White color */
}

.footer-section p {  /* Footer paragraph */
  margin-bottom: 1rem;  /* Bottom margin */
  color: #ccc;  /* Light grey */
}

.footer-section ul {  /* Footer list */
  list-style: none;  /* Remove bullets */
}

.footer-section li {  /* Footer list item */
  margin-bottom: 0.5rem;  /* Bottom margin */
}

.footer-section a {  /* Footer links */
  color: #ccc;  /* Light grey */
  text-decoration: none;  /* Remove underline */
  transition: var(--transition);  /* Smooth transition */
}

.footer-section a:hover {  /* Footer link hover */
  color: white;  /* White color */
}

.social-links {  /* Social media links */
  display: flex;  /* Flexbox */
  gap: 1rem;  /* Gap */
  margin-top: 1rem;  /* Top margin */
}

.social-links a {  /* Social links */
  font-size: 1.5rem;  /* Large font */
  transition: var(--transition);  /* Smooth transition */
}

.social-links a:hover {  /* Social link hover */
  transform: scale(1.1);  /* Scale effect */
}

.footer-bottom {  /* Footer bottom */
  border-top: 1px solid #444;  /* Top border */
  padding-top: 1rem;  /* Top padding */
  display: flex;  /* Flexbox */
  justify-content: space-between;  /* Space between */
  align-items: center;  /* Center vertically */
  flex-wrap: wrap;  /* Wrap on small screens */
  gap: 1rem;  /* Gap */
}

.footer-links {  /* Footer links */
  display: flex;  /* Flexbox */
  gap: 1rem;  /* Gap */
}

/* Modal Styles */
.mobile-menu-modal {  /* Mobile menu modal */
  border: none;  /* Remove border */
  border-radius: var(--border-radius);  /* Border radius */
  box-shadow: var(--shadow);  /* Shadow */
  width: 90vw;  /* Width */
  max-width: 300px;  /* Max width */
}

.modal-content {  /* Modal content */
  padding: 2rem;  /* Padding */
}

.modal-close {  /* Modal close button */
  position: absolute;  /* Absolute positioning */
  top: 1rem;  /* Top position */
  right: 1rem;  /* Right position */
  background: none;  /* No background */
  border: none;  /* No border */
  font-size: 1.5rem;  /* Large font */
  cursor: pointer;  /* Pointer cursor */
}

.mobile-nav-menu {  /* Mobile navigation menu */
  list-style: none;  /* Remove bullets */
  padding: 0;  /* Remove padding */
}

.mobile-nav-menu li {  /* Mobile menu item */
  margin-bottom: 1rem;  /* Bottom margin */
}

.mobile-nav-menu a {  /* Mobile menu link */
  display: block;  /* Block display */
  padding: 1rem;  /* Padding */
  text-decoration: none;  /* Remove underline */
  color: var(--text-color);  /* Text color */
  border-radius: var(--border-radius);  /* Border radius */
  transition: var(--transition);  /* Smooth transition */
}

.mobile-nav-menu a:hover {  /* Mobile menu link hover */
  background: var(--primary-color);  /* Primary background */
  color: white;  /* White text */
}

/* NoScript Styles */
.noscript-message {  /* NoScript message */
  position: fixed;  /* Fixed positioning */
  top: 50%;  /* Center vertically */
  left: 50%;  /* Center horizontally */
  transform: translate(-50%, -50%);  /* Center transform */
  background: var(--background-color);  /* White background */
  padding: 2rem;  /* Padding */
  border-radius: var(--border-radius);  /* Border radius */
  box-shadow: var(--shadow);  /* Shadow */
  text-align: center;  /* Center text */
  z-index: 1000;  /* High z-index */
}

/* Responsive Design - Media Queries (W3Schools: CSS Media Queries) */
@media (max-width: 768px) {  /* Tablet and mobile styles */
  .nav-menu {  /* Navigation menu on mobile */
    display: none;  /* Hide desktop menu */
  }

  .mobile-menu-toggle {  /* Show mobile menu toggle */
    display: block;  /* Block display */
  }

  .hero-actions {  /* Hero actions on mobile */
    flex-direction: column;  /* Vertical stacking */
    align-items: center;  /* Center alignment */
  }

  .about-content {  /* About content on mobile */
    grid-template-columns: 1fr;  /* Single column */
    gap: 2rem;  /* Reduced gap */
  }

  .contact-content {  /* Contact content on mobile */
    grid-template-columns: 1fr;  /* Single column */
    gap: 2rem;  /* Reduced gap */
  }

  .footer-content {  /* Footer content on mobile */
    grid-template-columns: 1fr;  /* Single column */
    gap: 2rem;  /* Reduced gap */
  }

  .footer-bottom {  /* Footer bottom on mobile */
    flex-direction: column;  /* Vertical stacking */
    text-align: center;  /* Center text */
  }

  .footer-links {  /* Footer links on mobile */
    order: -1;  /* Move to top */
  }
}

@media (max-width: 480px) {  /* Mobile styles */
  .container {  /* Container on mobile */
    padding: 0 1rem;  /* Reduced padding */
  }

  main {  /* Main content on mobile */
    padding: 1rem;  /* Reduced padding */
  }

  .hero-section {  /* Hero section on mobile */
    padding: 4rem 1rem;  /* Reduced padding */
  }

  section {  /* Sections on mobile */
    margin-bottom: 2rem;  /* Reduced margin */
    padding: 2rem 0;  /* Reduced padding */
  }

  .services-grid {  /* Services grid on mobile */
    grid-template-columns: 1fr;  /* Single column */
  }

  .testimonials-grid {  /* Testimonials grid on mobile */
    grid-template-columns: 1fr;  /* Single column */
  }

  .hero-stats {  /* Hero stats on mobile */
    grid-template-columns: repeat(2, 1fr);  /* Two columns */
    gap: 1rem;  /* Reduced gap */
  }
}

/* Print Styles (W3Schools: CSS Print) */
@media print {  /* Print media query */
  * {  /* Reset for print */
    background: transparent !important;  /* Transparent background */
    color: black !important;  /* Black text */
    box-shadow: none !important;  /* Remove shadows */
  }

  body {  /* Body for print */
    font-size: 12pt;  /* Print font size */
  }

  header,  /* Hide elements for print */
  footer,  /* Hide footer */
  .mobile-menu-toggle,  /* Hide mobile menu */
  .hero-actions,  /* Hide hero actions */
  .social-links {  /* Hide social links */
    display: none !important;  /* Force hide */
  }

  .container {  /* Container for print */
    max-width: none;  /* No max width */
    padding: 0;  /* No padding */
  }

  a {  /* Links for print */
    text-decoration: underline;  /* Underline links */
  }

  a[href^="http"]:after {  /* Add URLs after external links */
    content: " (" attr(href) ")";  /* Show URL in parentheses */
  }
}`;
  }
  if (/(javascript|js|script)/i.test(lower)) {
    return `// JavaScript: Modern ES6+ Features, DOM Manipulation, and Async Programming
// W3Schools JavaScript Tutorial: https://www.w3schools.com/js/
// This example demonstrates modern JavaScript features, DOM manipulation, and asynchronous programming

// ES6+ Variable Declarations - let, const, and var differences (W3Schools: JavaScript Variables)
let userName = 'Alice';  // let - block-scoped, can be reassigned (W3Schools: JavaScript let)
const PI = 3.14159;      // const - block-scoped, cannot be reassigned (W3Schools: JavaScript const)
var oldStyle = 'deprecated'; // var - function-scoped, avoid using (W3Schools: JavaScript var)

// Template Literals - Modern string interpolation (W3Schools: JavaScript Template Literals)
const greeting = \`Hello, \${userName}! Welcome to modern JavaScript!\`;  // Template literal with interpolation
console.log(greeting);  // Output: "Hello, Alice! Welcome to modern JavaScript!"

// Arrow Functions - Concise function syntax (W3Schools: JavaScript Arrow Functions)
const calculateArea = (width, height) => width * height;  // Arrow function - implicit return
const greetUser = (name) => {  // Arrow function with block body
  const message = \`Welcome, \${name}!\`;  // Local variable
  console.log(message);  // Console output
  return message;  // Explicit return
};

// Default Parameters - Function parameters with fallback values (W3Schools: JavaScript Default Parameters)
const createUser = (name = 'Anonymous', age = 18, email = 'user@example.com') => {  // Default parameters
  return {  // Return object literal
    name,  // Shorthand property name (ES6)
    age,   // Shorthand property age
    email, // Shorthand property email
    createdAt: new Date().toISOString(),  // Current timestamp (W3Schools: JavaScript Date)
  };
};

const user1 = createUser('Bob', 25);  // Uses defaults for email
const user2 = createUser();  // Uses all defaults
console.log('User 1:', user1);  // Output user object
console.log('User 2:', user2);  // Output user object

// Destructuring Assignment - Extract values from arrays/objects (W3Schools: JavaScript Destructuring)
const [firstName, lastName] = ['John', 'Doe'];  // Array destructuring
const { name: userName, age: userAge } = user1;  // Object destructuring with renaming
console.log(\`Destructured: \${firstName} \${lastName}, Age: \${userAge}\`);  // Use destructured values

// Spread Syntax - Expand arrays/objects (W3Schools: JavaScript Spread Operator)
const numbers = [1, 2, 3];  // Original array
const moreNumbers = [...numbers, 4, 5, 6];  // Spread array into new array
const userCopy = { ...user1, lastLogin: new Date() };  // Spread object with additional properties
console.log('Spread array:', moreNumbers);  // Output: [1, 2, 3, 4, 5, 6]
console.log('Spread object:', userCopy);  // Output object with additional property

// Rest Parameters - Collect remaining arguments (W3Schools: JavaScript Rest Parameters)
const sumAll = (...numbers) => {  // Rest parameter collects all arguments
  return numbers.reduce((total, num) => total + num, 0);  // Array.reduce for summation
};
console.log('Sum of 1, 2, 3, 4:', sumAll(1, 2, 3, 4));  // Output: 10

// Array Methods - Modern array manipulation (W3Schools: JavaScript Array Methods)
const fruits = ['apple', 'banana', 'cherry', 'date'];  // Array literal

// map() - Transform each element (W3Schools: JavaScript Array map())
const upperFruits = fruits.map(fruit => fruit.toUpperCase());  // Transform to uppercase
console.log('Uppercase fruits:', upperFruits);  // Output: ['APPLE', 'BANANA', 'CHERRY', 'DATE']

// filter() - Filter elements based on condition (W3Schools: JavaScript Array filter())
const longFruits = fruits.filter(fruit => fruit.length > 5);  // Filter long fruit names
console.log('Long fruit names:', longFruits);  // Output: ['banana', 'cherry']

// find() - Find first matching element (W3Schools: JavaScript Array find())
const foundFruit = fruits.find(fruit => fruit.startsWith('c'));  // Find fruit starting with 'c'
console.log('Fruit starting with c:', foundFruit);  // Output: 'cherry'

// reduce() - Reduce array to single value (W3Schools: JavaScript Array reduce())
const fruitLengths = fruits.reduce((total, fruit) => total + fruit.length, 0);  // Sum of lengths
console.log('Total fruit name length:', fruitLengths);  // Output: total characters

// Async/Await - Modern asynchronous programming (W3Schools: JavaScript Async/Await)
const fetchUserData = async (userId) => {  // Async function declaration
  try {  // Try-catch for error handling (W3Schools: JavaScript Errors)
    console.log(\`Fetching data for user \${userId}...\`);  // Log start of operation

    // Simulate API call with Promise (W3Schools: JavaScript Promises)
    const response = await new Promise((resolve, reject) => {  // Create promise
      setTimeout(() => {  // Simulate network delay
        if (userId > 0) {  // Simulate successful response
          resolve({  // Resolve with user data
            id: userId,
            name: \`User \${userId}\`,
            email: \`user\${userId}@example.com\`,
          });
        } else {  // Simulate error
          reject(new Error('Invalid user ID'));  // Reject with error
        }
      }, 1000);  // 1 second delay
    });

    console.log('Data fetched successfully:', response);  // Log success
    return response;  // Return resolved data

  } catch (error) {  // Catch block for errors
    console.error('Error fetching user data:', error.message);  // Log error
    throw error;  // Re-throw error
  }
};

// Promise.all() - Handle multiple async operations (W3Schools: JavaScript Promise.all)
const fetchMultipleUsers = async () => {  // Async function for multiple fetches
  const userIds = [1, 2, 3];  // Array of user IDs

  try {  // Try-catch block
    console.log('Fetching multiple users...');  // Log operation start
    const promises = userIds.map(id => fetchUserData(id));  // Create array of promises
    const users = await Promise.all(promises);  // Wait for all promises to resolve
    console.log('All users fetched:', users);  // Log results
    return users;  // Return array of users

  } catch (error) {  // Catch errors
    console.error('Error fetching multiple users:', error.message);  // Log error
    return [];  // Return empty array on error
  }
};

// Classes - Object-oriented programming in ES6+ (W3Schools: JavaScript Classes)
class UserManager {  // Class declaration
  constructor() {  // Constructor method
    this.users = [];  // Instance property - array of users
    this.nextId = 1;  // Instance property - next available ID
  }

  // Instance method - add user
  addUser(name, email) {  // Method to add user
    const user = {  // Create user object
      id: this.nextId++,  // Assign ID and increment
      name,  // Shorthand property
      email, // Shorthand property
      createdAt: new Date(),  // Creation timestamp
    };
    this.users.push(user);  // Add to users array
    return user;  // Return created user
  }

  // Instance method - find user by ID
  findUserById(id) {  // Method to find user
    return this.users.find(user => user.id === id);  // Array.find() method
  }

  // Instance method - get all users
  getAllUsers() {  // Method to get all users
    return [...this.users];  // Return copy of users array
  }

  // Static method - validate email (W3Schools: JavaScript Static Methods)
  static validateEmail(email) {  // Static method - no instance needed
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;  // Email regex pattern
    return emailRegex.test(email);  // Test email against pattern
  }

  // Getter - computed property (W3Schools: JavaScript Getters)
  get userCount() {  // Getter method
    return this.users.length;  // Return number of users
  }
}

// Create instance and use class
const userManager = new UserManager();  // Instantiate class
const newUser = userManager.addUser('Alice', 'alice@example.com');  // Add user
console.log('New user added:', newUser);  // Log new user
console.log('Total users:', userManager.userCount);  // Use getter

// Validate email using static method
console.log('Email valid:', UserManager.validateEmail('test@example.com'));  // true
console.log('Email valid:', UserManager.validateEmail('invalid-email'));  // false

// Modules - ES6 module system (W3Schools: JavaScript Modules)
// This would be in separate files in a real application
const mathUtils = {  // Module-like object
  add: (a, b) => a + b,  // Addition function
  subtract: (a, b) => a - b,  // Subtraction function
  multiply: (a, b) => a * b,  // Multiplication function
  divide: (a, b) => a / b,  // Division function
};

console.log('Math utils:', mathUtils.add(5, 3));  // Use module function

// DOM Manipulation - Interacting with HTML elements (W3Schools: JavaScript HTML DOM)
document.addEventListener('DOMContentLoaded', () => {  // Wait for DOM to load (W3Schools: JavaScript DOM)
  console.log('DOM fully loaded');  // Log DOM ready

  // Create elements dynamically
  const container = document.createElement('div');  // Create div element
  container.id = 'app-container';  // Set ID attribute
  container.className = 'app-wrapper';  // Set class attribute

  const heading = document.createElement('h2');  // Create heading element
  heading.textContent = 'JavaScript Demo';  // Set text content
  heading.style.color = 'blue';  // Set inline style

  const button = document.createElement('button');  // Create button element
  button.textContent = 'Click Me!';  // Set button text
  button.className = 'demo-button';  // Set class

  // Event Listeners - Handle user interactions (W3Schools: JavaScript Events)
  button.addEventListener('click', async () => {  // Click event listener
    console.log('Button clicked!');  // Log click
    button.textContent = 'Loading...';  // Update button text
    button.disabled = true;  // Disable button

    try {  // Try-catch for async operation
      await fetchMultipleUsers();  // Call async function
      button.textContent = 'Success!';  // Update on success
    } catch (error) {  // Handle errors
      button.textContent = 'Error!';  // Update on error
      console.error('Button click error:', error);  // Log error
    } finally {  // Always execute
      button.disabled = false;  // Re-enable button
    }
  });

  // Append elements to DOM
  container.appendChild(heading);  // Add heading to container
  container.appendChild(button);  // Add button to container

  // Insert into document
  const body = document.body;  // Get body element
  body.appendChild(container);  // Add container to body

  // Query selectors - Find elements in DOM (W3Schools: JavaScript Selectors)
  const demoButton = document.querySelector('.demo-button');  // Select by class
  const appContainer = document.getElementById('app-container');  // Select by ID

  console.log('Demo button found:', demoButton);  // Log found element
  console.log('App container found:', appContainer);  // Log found element

  // Style manipulation
  appContainer.style.cssText = \`
    padding: 20px;
    margin: 20px auto;
    max-width: 600px;
    border: 2px solid #ddd;
    border-radius: 8px;
    background-color: #f9f9f9;
  \`;  // Set multiple styles

  // Local Storage - Persist data in browser (W3Schools: JavaScript Local Storage)
  const saveData = () => {  // Function to save data
    const data = {  // Data object
      timestamp: new Date().toISOString(),  // Current timestamp
      userCount: userManager.userCount,  // User count from class
      lastAction: 'demo_completed',  // Last action
    };
    localStorage.setItem('jsDemoData', JSON.stringify(data));  // Save to localStorage
    console.log('Data saved to localStorage:', data);  // Log saved data
  };

  const loadData = () => {  // Function to load data
    const savedData = localStorage.getItem('jsDemoData');  // Get from localStorage
    if (savedData) {  // Check if data exists
      const parsedData = JSON.parse(savedData);  // Parse JSON
      console.log('Data loaded from localStorage:', parsedData);  // Log loaded data
      return parsedData;  // Return parsed data
    }
    return null;  // Return null if no data
  };

  // Save data when button is clicked
  button.addEventListener('click', saveData);  // Add save listener

  // Load data on page load
  const loadedData = loadData();  // Load saved data
  if (loadedData) {  // If data exists
    console.log('Welcome back! Previous session:', loadedData.timestamp);  // Welcome message
  }

  // SetInterval - Execute code repeatedly (W3Schools: JavaScript Timing)
  let counter = 0;  // Counter variable
  const intervalId = setInterval(() => {  // Set interval
    counter++;  // Increment counter
    console.log(\`Interval execution #\${counter}\`);  // Log execution

    if (counter >= 5) {  // Stop after 5 executions
      clearInterval(intervalId);  // Clear interval
      console.log('Interval stopped');  // Log stop
    }
  }, 2000);  // Execute every 2 seconds

  // Error handling with try-catch
  const riskyOperation = () => {  // Function that might throw error
    if (Math.random() > 0.5) {  // Random condition
      throw new Error('Random error occurred!');  // Throw error
    }
    return 'Operation successful';  // Return success message
  };

  try {  // Try block
    const result = riskyOperation();  // Call risky function
    console.log('Risky operation result:', result);  // Log success
  } catch (error) {  // Catch block
    console.error('Risky operation failed:', error.message);  // Log error
  }

  // Fetch API - Modern way to make HTTP requests (W3Schools: JavaScript Fetch)
  const fetchDemo = async () => {  // Async function for fetch demo
    try {  // Try-catch block
      console.log('Fetching data from API...');  // Log start
      const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');  // Fetch data

      if (!response.ok) {  // Check response status
        throw new Error(\`HTTP error! status: \${response.status}\`);  // Throw error for bad response
      }

      const data = await response.json();  // Parse JSON response
      console.log('Fetched data:', data);  // Log fetched data

    } catch (error) {  // Catch errors
      console.error('Fetch failed:', error.message);  // Log error
    }
  };

  // Uncomment to test fetch (requires internet connection)
  // fetchDemo();
});

// Export for use in other modules (would be used with import/export in real app)
export {  // Export object
  createUser,  // Export function
  fetchUserData,  // Export function
  UserManager,  // Export class
  mathUtils,  // Export utilities
};

// IIFE - Immediately Invoked Function Expression (W3Schools: JavaScript Functions)
(function() {  // IIFE definition
  console.log('IIFE executed immediately');  // Log execution
  // Variables inside IIFE are private
  const privateVariable = 'This is private';  // Private variable
  console.log(privateVariable);  // Accessible inside IIFE
})();  // Immediate execution

// console.log(privateVariable); // This would cause ReferenceError - variable not accessible outside IIFE

// Symbol - New primitive type for unique identifiers (W3Schools: JavaScript Symbols)
const uniqueId = Symbol('id');  // Create symbol
const user = {  // Object with symbol property
  name: 'Alice',
  [uniqueId]: 12345,  // Symbol as property key
};
console.log('User with symbol property:', user);  // Log user object
console.log('Symbol value:', user[uniqueId]);  // Access symbol property

// BigInt - For large integers (W3Schools: JavaScript BigInt)
const largeNumber = 123456789012345678901234567890n;  // BigInt literal
const anotherLarge = BigInt('123456789012345678901234567890');  // BigInt constructor
console.log('Large number:', largeNumber);  // Log BigInt
console.log('Sum of large numbers:', largeNumber + anotherLarge);  // BigInt arithmetic

// Optional Chaining - Safe property access (W3Schools: JavaScript Optional Chaining)
const nestedObject = {  // Nested object
  user: {  // User object
    profile: {  // Profile object
      name: 'Alice',  // Name property
    },
  },
};

console.log('Safe access:', nestedObject?.user?.profile?.name);  // Safe access with ?.
console.log('Unsafe access would be:', nestedObject.user.profile.name);  // Direct access (same result)

// Nullish Coalescing - Fallback for null/undefined (W3Schools: JavaScript Nullish Coalescing)
const defaultValue = null;  // Null value
const fallback = defaultValue ?? 'Default';  // Nullish coalescing
console.log('Nullish coalescing result:', fallback);  // Output: 'Default'

const zeroValue = 0;  // Zero value (falsy but not nullish)
const zeroFallback = zeroValue ?? 'Default';  // Won't use default
console.log('Zero value result:', zeroFallback);  // Output: 0`;
  }
  return '';
}

function buildAssistantResponse(query, results) {
  const cleanedQuery = query.trim();
  if (!cleanedQuery) {
    return {
      summary: 'Type a question to receive a direct answer, code sample, or professional search result summary.',
      intent: 'Ready to answer your next search query.',
      followUps: ['Search for AI search strategy', 'Ask for a code sample', 'Ask how to build a search assistant'],
      answer: 'Enter any business, design, or development query to get an answer or code output.',
      answerType: 'text',
      codeSnippet: ''
    };
  }

  // Check if this is primarily a code request
  const lowerQuery = cleanedQuery.toLowerCase();
  const isCodeSnippetQuery = isCodeSnippet(cleanedQuery);
  const isCodeQuery = isCodeSnippetQuery ||
                     /(code|example|snippet|function|class|script|program|implement|write|create)/i.test(lowerQuery) ||
                     /(react|node|python|javascript|express|api|component|backend)/i.test(lowerQuery) ||
                     lowerQuery.length < 20 && /(how|what|show|give)/i.test(lowerQuery);

  const localCodeSnippet = generateLocalCode(cleanedQuery);
  const codeSnippet = isCodeSnippetQuery ? cleanedQuery : localCodeSnippet;

  if (isCodeSnippetQuery) {
    return {
      summary: `I detected code in your input and will explain it line by line.`,
      intent: `Code explanation: dissecting the provided code snippet.`,
      followUps: [
        `Show me how each line works`,
        `What does each variable do`,
        `Describe this code with examples`
      ],
      answer: `Below is a detailed, line-by-line explanation of the code you pasted. Each part of the snippet is described with syntax, purpose, and recommended best practices.`,
      answerType: 'code-explanation',
      codeSnippet
    };
  }

  if (isCodeQuery && localCodeSnippet) {
    return {
      summary: `Here's a code example for "${cleanedQuery}".`,
      intent: `Code generation: providing implementation example for "${cleanedQuery}".`,
      followUps: [
        `Show me how to use this code`,
        `Explain the code structure`,
        `Generate a more complex version`
      ],
      answer: `Here's a practical code example that demonstrates "${cleanedQuery}". You can copy and modify this code for your project.`,
      answerType: 'code',
      codeSnippet
    };
  }

  const top = results[0];
  if (results.length === 0) {
    return {
      summary: `No strong matches were found for "${cleanedQuery}". Try broadening the query or changing the category.`,
      intent: `Search intent: discover resources for "${cleanedQuery}".`,
      followUps: [`Search for "${cleanedQuery} use cases"`, `Search for "${cleanedQuery} best practices"`, `Search for "${cleanedQuery} examples"`],
      answer: `I could not find a direct match for your query, but I can still help with guidance on "${cleanedQuery}".`, 
      answerType: 'text',
      codeSnippet: generateLocalCode(cleanedQuery)
    };
  }

  const categories = [...new Set(results.map((item) => item.category))].join(', ');
  const tags = [...new Set(results.flatMap((item) => item.tags))].slice(0, 4).join(', ');

  return {
    summary: `I found ${results.length} relevant sources across ${categories}. Top recommendation: ${top.title}.`,
    intent: `Search intent: retrieve professional guidance and examples related to "${cleanedQuery}".`,
    followUps: [
      `Show me code for ${top.tags[0] || 'AI search'}`,
      `Explain how to use ${tags}`,
      `Compare ${cleanedQuery} to alternative approaches`
    ],
    answer: `The best result for your query is "${top.title}" from ${top.source}. ${top.description}`,
    answerType: codeSnippet ? 'code' : 'text',
    codeSnippet
  };
}

app.post('/api/search', async (req, res) => {
  const { query = '', category = 'All', tag = 'All' } = req.body;
  const filters = { category, tag };
  const results = performSearch(query, filters);
  let assistant = buildAssistantResponse(query, results);
  const isCodeSnippetInput = isCodeSnippet(query);

  let webSearchData = { results: [], totalResults: 0, searchTime: '0.00s', source: 'Google Custom Search' };
  let wikiSummary = null;

  if (query.trim()) {
    try {
      webSearchData = await performWebSearch(query, 6);
    } catch (error) {
      console.error('Web search failed:', error.message);
    }

    try {
      wikiSummary = await getWikipediaInfo(query);
    } catch (error) {
      console.error('Wikipedia lookup failed:', error.message);
    }

    try {
      const gfgInfo = await getGeeksForGeeksInfo(query);
      if (gfgInfo) {
        // Add to assistant context
        assistant.source = gfgInfo.source;
        assistant.followUps.push(`Learn more on Geeks for Geeks: ${gfgInfo.url}`);
      }
    } catch (error) {
      console.error('Geeks for Geeks lookup failed:', error.message);
    }
  }

  if (!openai && results.length === 0 && (wikiSummary?.extract || webSearchData.results.length > 0)) {
    assistant = {
      title: 'AI web search assistant',
      summary: wikiSummary?.extract
        ? `Sourced from Wikipedia for "${query}".`
        : `Found ${webSearchData.results.length} web results for "${query}".`,
      intent: `Retrieve information from Google search for "${query}".`,
      followUps: [
        `Search for ${query} best practices`,
        `Show me examples using ${query}`,
        `Compare ${query} implementations`
      ],
      answer: wikiSummary?.extract || webSearchData.results[0].snippet || `No direct answer found for "${query}".`,
      answerType: 'text',
      codeSnippet: '',
      source: wikiSummary?.source || webSearchData.source || 'Web search'
    };
  }

  if (openai && query.trim()) {
    try {
      const webContext = webSearchData.results.length
        ? `Web search context:\n${webSearchData.results.slice(0, 3).map((item, idx) => `${idx + 1}. ${item.title}: ${item.snippet} (${item.url})`).join('\n')}`
        : '';
      const wikiContext = wikiSummary?.extract
        ? `Wikipedia summary:\n${wikiSummary.extract}\nSource: ${wikiSummary.url}`
        : '';
      const prompt = isCodeSnippetInput
        ? `You are a professional programming assistant. The user's input is a code snippet that must be explained line by line. Do not generate new code. Explain every single line of the provided code, with syntax, behavior, purpose, and any relevant best practices from W3Schools or similar resources. If the code uses HTML, CSS, JavaScript, Python, Java, Dart, React, Node.js, or backend concepts, reference the correct tutorial links. Provide a clean explanation that maps directly to the pasted code.\n\nCode to explain:\n${query}`
        : `You are a professional AI search engine assistant specializing in programming languages and web development. Answer the user query directly and concisely. If the query asks for code, examples, or implementation in any programming language (Python, Java, Dart, React JS, Node JS, HTML, CSS, JavaScript), provide a complete, working code snippet with extremely detailed line-by-line comments explaining each part of the code. Include explanations for:\n\n- Variable declarations and their purposes\n- Function definitions and parameters\n- Control structures (loops, conditionals)\n- Class definitions and methods\n- API calls and data handling\n- DOM manipulation and event handling\n- Framework-specific concepts\n- Best practices from W3Schools tutorials\n- Syntax rules and conventions\n- Error handling and edge cases\n- Performance considerations\n\nFor each programming language, reference W3Schools best practices and include links to relevant W3Schools tutorials. Explain every single line of code in detail, including why certain approaches are used and what alternatives exist.\n\nProgramming Language References:\n- Python: https://www.w3schools.com/python/\n- Java: https://www.w3schools.com/java/\n- Dart: https://www.w3schools.com/dart/\n- React JS: https://www.w3schools.com/react/\n- Node.js: https://www.w3schools.com/nodejs/\n- HTML: https://www.w3schools.com/html/\n- CSS: https://www.w3schools.com/css/\n- JavaScript: https://www.w3schools.com/js/\n\nIf it's a general question, give a brief answer. Query: "${query}". Context: ${results[0]?.title ? `Top result: "${results[0].title}" - ${results[0].snippet}` : 'No specific results found'}.\n\n${webContext}\n\n${wikiContext}`;
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500
      });

      const rawText = completion.choices[0]?.message?.content;
      if (rawText) {
        const extracted = extractCodeFromResponse(rawText);
        assistant = {
          ...assistant,
          answer: extracted.answer || rawText || assistant.answer,
          codeSnippet: isCodeSnippetInput ? query : extracted.codeSnippet || assistant.codeSnippet,
          answerType: isCodeSnippetInput ? 'code-explanation' : extracted.codeSnippet ? 'code' : 'text',
          source: wikiSummary?.source || webSearchData.source || assistant.source || 'Web search'
        };
      }
    } catch (error) {
      console.error('OpenAI summary failed:', error.message);
    }
  }

  res.json({
    query,
    filters,
    results,
    webResults: webSearchData.results,
    webMeta: {
      totalResults: webSearchData.totalResults,
      queryTimeMs: Math.round((parseFloat(webSearchData.searchTime) || 0) * 1000)
    },
    assistant,
    meta: {
      resultCount: results.length,
      queryTimeMs: 12 + Math.round(Math.random() * 50)
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// New: Weather API endpoint
app.get('/api/weather', async (req, res) => {
  const { lat, lon, location = 'Local area' } = req.query;

  try {
    const weatherData = await getWeather(lat, lon, location);
    res.json({ success: true, data: weatherData });
  } catch (error) {
    console.error('Weather fetch failed:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch weather data' });
  }
});

// New: News/Articles API endpoint
app.get('/api/news', async (req, res) => {
  const { category = 'general', country = 'in', limit = 10 } = req.query;

  try {
    const data = await getNews(category, country);
    res.json({
      success: true,
      data: {
        articles: (data.articles || []).slice(0, parseInt(limit, 10)),
        totalResults: data.totalResults || (data.articles || []).length,
        category: category,
        country: country,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
        source: data.source || 'NewsAPI',
      }
    });
  } catch (error) {
    console.error('News fetch failed:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch news' });
  }
});

// New: Web Search API endpoint
app.post('/api/web-search', async (req, res) => {
  const { query = '', limit = 10, searchType = 'web' } = req.body;

  if (!query.trim()) {
    return res.status(400).json({ success: false, message: 'Query is required' });
  }

  try {
    const data = await performWebSearch(query, limit, searchType);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Web search failed:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch web search results' });
  }
});

// New: Google Search API endpoint
app.post('/api/google-search', async (req, res) => {
  const { query = '', limit = 10, searchType = 'web' } = req.body;

  if (!query.trim()) {
    return res.status(400).json({ success: false, message: 'Query is required' });
  }

  try {
    const data = await performWebSearch(query, limit, searchType);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Google search failed:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch Google search results' });
  }
});

// New: ChatGPT-like AI chat endpoint
app.post('/api/chat', async (req, res) => {
  const { messages = [] } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, message: 'Messages are required' });
  }

  if (!openai) {
    return res.status(503).json({ success: false, message: 'OpenAI API key is not configured' });
  }

  try {
    const systemMessage = {
      role: 'system',
      content: 'You are a helpful assistant that answers questions clearly and concisely. Provide ChatGPT-style responses for programming, search, and general AI queries. Use information from Geeks for Geeks and Wikipedia when relevant.'
    };

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [systemMessage, ...messages.map((item) => ({ role: item.role, content: item.content }))],
      max_tokens: 500,
      temperature: 0.8,
    });

    const reply = response.choices?.[0]?.message?.content || 'I could not generate a response at this time.';
    res.json({ success: true, data: { reply } });
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate chat response' });
  }
});

// New: Music API endpoint
app.get('/api/music', async (req, res) => {
  const { language = 'english', limit = 10 } = req.query;

  try {
    const data = await getMusicTracks(language, limit);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Music fetch failed:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch music tracks' });
  }
});

// New: Trending Topics API endpoint
app.get('/api/trends', (req, res) => {
  const { category = 'technology', limit = 10 } = req.query;
  
  // Mock trending data
  const trendingTopics = {
    trending: [
      {
        rank: 1,
        topic: 'Artificial Intelligence',
        volume: 'Very High',
        trend: 'up',
        articles: 2450,
        mentions: 15000,
        growth: '+45%',
      },
      {
        rank: 2,
        topic: 'Web Development',
        volume: 'High',
        trend: 'stable',
        articles: 1820,
        mentions: 8500,
        growth: '+12%',
      },
      {
        rank: 3,
        topic: 'Cloud Computing',
        volume: 'High',
        trend: 'up',
        articles: 1650,
        mentions: 7200,
        growth: '+28%',
      },
      {
        rank: 4,
        topic: 'Machine Learning',
        volume: 'Medium',
        trend: 'up',
        articles: 1420,
        mentions: 6100,
        growth: '+35%',
      },
      {
        rank: 5,
        topic: 'Cybersecurity',
        volume: 'Medium',
        trend: 'up',
        articles: 980,
        mentions: 4500,
        growth: '+22%',
      },
    ],
    category: category,
    lastUpdated: new Date().toISOString(),
  };
  
  res.json({
    success: true,
    data: {
      ...trendingTopics,
      trending: trendingTopics.trending.slice(0, parseInt(limit))
    }
  });
});

// New: Comparison endpoint
app.post('/api/compare', (req, res) => {
  const { topics = [] } = req.body;
  
  if (!topics || topics.length === 0) {
    return res.status(400).json({ success: false, message: 'Topics array is required' });
  }
  
  // Mock comparison data
  const comparison = {
    topics: topics,
    comparisons: [
      {
        name: topics[0] || 'Option A',
        pros: ['Fast', 'Reliable', 'Easy to use'],
        cons: ['Limited features', 'Higher cost'],
        rating: 4.2,
        price: '$99/month',
        market: 25,
      },
      {
        name: topics[1] || 'Option B',
        pros: ['Feature-rich', 'Affordable', 'Great support'],
        cons: ['Steep learning curve'],
        rating: 4.5,
        price: '$49/month',
        market: 40,
      },
      {
        name: topics[2] || 'Option C',
        pros: ['Most affordable', 'Open source', 'Active community'],
        cons: ['Less support', 'Requires technical skill'],
        rating: 4.0,
        price: 'Free',
        market: 35,
      },
    ],
    recommendation: 'Option B offers the best balance of features and price',
    lastUpdated: new Date().toISOString(),
  };
  
  res.json({ success: true, data: comparison });
});

// New: Advanced Analysis endpoint
app.post('/api/analyze', (req, res) => {
  const { query = '', depth = 'basic' } = req.body;
  
  if (!query.trim()) {
    return res.status(400).json({ success: false, message: 'Query is required' });
  }
  
  // Mock analysis data
  const analysis = {
    topic: query,
    depth: depth,
    overview: `Comprehensive analysis of ${query} including market trends, best practices, and expert insights.`,
    sections: [
      {
        title: 'Executive Summary',
        content: `${query} is a trending topic with significant market interest and growth potential.`,
      },
      {
        title: 'Industry Trends',
        content: 'Current market trends indicate 25% year-over-year growth in this sector.',
      },
      {
        title: 'Best Practices',
        content: 'Expert recommendations highlight efficiency, scalability, and user experience as key factors.',
      },
      {
        title: 'Market Size',
        content: 'The market for this topic is estimated at $50B globally with 30% annual growth.',
      },
      {
        title: 'Key Players',
        content: 'Leading companies in this space include major tech firms and innovative startups.',
      },
      {
        title: 'Investment Opportunities',
        content: 'Venture capital funding in this area has reached record levels in 2024.',
      },
    ],
    sentiment: 'positive',
    confidence: 0.92,
    sources: 25,
    recommendations: [
      'Focus on core features and user experience',
      'Monitor competitive landscape closely',
      'Invest in talent acquisition and retention',
      'Build strategic partnerships',
    ],
    lastUpdated: new Date().toISOString(),
  };
  
  res.json({ success: true, data: analysis });
});

// New: Market Data endpoint
app.get('/api/market-data', (req, res) => {
  // Mock market data
  const marketData = {
    lastUpdated: new Date().toISOString(),
    markets: [
      {
        symbol: 'TECH',
        name: 'Tech Sector Index',
        price: 5432.10,
        change: 145.25,
        changePercent: 2.74,
        trend: 'up',
      },
      {
        symbol: 'AI',
        name: 'AI Companies ETF',
        price: 287.50,
        change: 12.30,
        changePercent: 4.47,
        trend: 'up',
      },
      {
        symbol: 'CLOUD',
        name: 'Cloud Services Index',
        price: 412.75,
        change: -8.50,
        changePercent: -2.02,
        trend: 'down',
      },
    ],
  };
  
  res.json({ success: true, data: marketData });
});

// New: Compare results endpoint - enhanced comparison
app.post('/api/compare-results', (req, res) => {
  const { query = '', sources = [] } = req.body;
  
  if (!query.trim()) {
    return res.status(400).json({ success: false, message: 'Query is required' });
  }
  
  // Mock comparison of multiple sources
  const comparison = {
    query: query,
    sources: sources.length > 0 ? sources : ['Source A', 'Source B', 'Source C'],
    analysis: {
      relevanceScores: {
        'Source A': 0.92,
        'Source B': 0.87,
        'Source C': 0.78,
      },
      updateFrequency: {
        'Source A': 'Daily',
        'Source B': 'Weekly',
        'Source C': 'Monthly',
      },
      accuracy: {
        'Source A': '94%',
        'Source B': '89%',
        'Source C': '82%',
      },
    },
    recommendation: 'Source A provides the most up-to-date and accurate information',
    lastUpdated: new Date().toISOString(),
  };
  
  res.json({ success: true, data: comparison });
});

// New: Research endpoint - comprehensive research
app.post('/api/research', (req, res) => {
  const { topic = '', depth = 'standard' } = req.body;
  
  if (!topic.trim()) {
    return res.status(400).json({ success: false, message: 'Topic is required' });
  }
  
  // Mock research data
  const research = {
    topic: topic,
    depth: depth,
    publications: [
      {
        title: `The Complete Guide to ${topic}`,
        authors: ['Dr. Smith', 'Prof. Johnson'],
        year: 2024,
        citations: 1250,
        url: 'https://example.com/research-1',
      },
      {
        title: `${topic} in Practice: Real-World Applications`,
        authors: ['Jane Doe', 'John Smith'],
        year: 2024,
        citations: 890,
        url: 'https://example.com/research-2',
      },
    ],
    statistics: {
      totalPublications: 4250,
      averageCitations: 85,
      growthRate: '+32% YoY',
    },
    keyFindings: [
      'Market adoption is accelerating rapidly',
      'Innovation is driven by enterprise demand',
      'Collaboration between academia and industry is increasing',
    ],
    lastUpdated: new Date().toISOString(),
  };
  
  res.json({ success: true, data: research });
});

app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(port, () => {
  console.log(`AI search server running on http://localhost:${port}`);
});
