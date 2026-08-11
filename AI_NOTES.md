# AI Log

## How AI Was Used

AI was used throughout the development of the project as a support tool. It helped with understanding implementation approaches, structuring parts of the solution, debugging issues, improving error handling, and reviewing the code during development.

The implementation was developed and tested through multiple iterations. When errors or unexpected behavior appeared during testing, AI was used to help identify the cause and suggest possible fixes. The suggestions were then tested against the actual project behavior and adjusted where necessary.

AI was also used during testing and review to identify edge cases and possible issues, including API failures and invalid input scenarios. The final implementation was manually reviewed, tested, and adjusted based on the results rather than being generated and used without verification.

## Key AI Contributions

* Assisted with the overall development approach and implementation structure.
* Helped with concurrent API processing and handling individual request failures.
* Assisted in identifying and fixing errors during development and testing.
* Suggested improvements to error handling and edge-case handling.
* Helped review the implementation and identify potential bugs.
* Supported documentation and code cleanup after testing.

## Development & Testing

The project went through multiple development and testing cycles. AI suggestions were used as guidance, while the actual code was run and verified manually. Issues found during testing were investigated, fixed, and tested again to confirm the expected behavior.

The final implementation was reviewed and adjusted manually to ensure that the code and documentation matched the actual project behavior.



__________________________________________________________________________________________________________________________________________




1. Concurrent Processing

Prompt:
"How do I fetch data for a list of items in parallel with Node's axios and async/await, without one failed request stopping the rest? Show a pattern using Promise.all where each request is individually handled."

Used in: fetchWeatherForOrders in src/weather.js

Why:
AI was used to understand how to process all weather requests concurrently while allowing individual city failures to be handled without stopping the remaining requests.

2. Error Handling

Prompt:
"What are the common failure cases when calling a third-party weather API, and what is a clean way to handle retries for temporary failures?"

Used in: withRetry in src/utils.js and fetchWeatherForCity in src/weather.js

Why:
AI helped identify common API failures such as invalid cities, timeouts, and server errors, and suggested appropriate handling for temporary versus permanent failures.

3. Apology Message Generation

Prompt:
"Write a prompt for an LLM that generates one short, friendly customer apology for a delivery delay using the customer's name, city, and weather reason."

Used in: buildApologyPrompt in src/ai.js

Why:
AI was used to design the prompt for generating short and consistent weather-related delay messages.

4. Review, Testing & Debugging

The project was tested multiple times during development using different scenarios, including valid cities, invalid cities, API failures, and other edge cases.

AI was used during development to help understand errors, identify possible bugs, and suggest fixes. One issue involving duplicate order IDs was identified during testing and corrected. The implementation was then tested again to verify the fix.

The final code and documentation were manually reviewed and adjusted based on the actual behavior of the project.
