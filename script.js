const themeToggle = document.getElementById('toggle-theme');
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    if (document.body.classList.contains('dark-theme')) {
        localStorage.setItem('theme', 'dark-theme');
    } else {
        localStorage.removeItem('theme');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const sendRequestBtn = document.getElementById('send-request');
    const saveRequestBtn = document.getElementById('save-request');
    const newRequestBtn = document.getElementById('new-request');
    const authTypeSelect = document.getElementById('auth-type');

    sendRequestBtn.addEventListener('click', sendRequest);
    saveRequestBtn.addEventListener('click', saveCurrentRequest);
    newRequestBtn.addEventListener('click', createNewRequest);
    authTypeSelect.addEventListener('change', toggleAuthFields);

    initializeHeadersSection();
    initializeQuerySection();
    initializeFormDataSection();
    loadSavedRequests();

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.classList.add(savedTheme);
    }
});

function sendRequest() {
    const method = document.getElementById('request-method').value;
    const url = document.getElementById('request-url').value;
    const headers = getHeaders();
    const authData = getAuthData();

    let fullUrl = url;

    const queryParams = getQueryParams();
    if (Object.keys(queryParams).length > 0) {
        const queryString = new URLSearchParams(queryParams).toString();
        fullUrl += `?${queryString}`;
    }

    const options = {
        method,
        headers: {
            ...headers,
            ...authData
        }
    };

    const contentType = document.getElementById('content-type').value;

    if (method !== 'GET') {
        if (contentType === 'application/json') {
            const jsonBody = document.getElementById('request-body').value;
            options.body = jsonBody;
            options.headers['Content-Type'] = 'application/json';
        } else if (contentType === 'application/x-www-form-urlencoded') {
            const formData = new URLSearchParams();
            document.querySelectorAll('.form-data-row').forEach(row => {
                const key = row.querySelector('.form-key').value;
                const value = row.querySelector('.form-value').value;
                if (key && value) {
                    formData.append(key, value);
                }
            });
            options.body = formData;
            options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        } else if (contentType === 'multipart/form-data') {
            const formData = new FormData();
            document.querySelectorAll('.form-data-row').forEach(row => {
                const key = row.querySelector('.form-key').value;
                const type = row.querySelector('.form-type').value;
                if (type === 'file') {
                    const fileInput = row.querySelector('.form-file');
                    if (fileInput.files.length > 0) {
                        formData.append(key, fileInput.files[0]);
                    }
                } else {
                    const value = row.querySelector('.form-value').value;
                    if (key && value) {
                        formData.append(key, value);
                    }
                }
            });
            options.body = formData;
            delete options.headers['Content-Type'];
        }
    }

    fetch(fullUrl, options)
        .then(response => {
            const responseData = {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
            };

            const contentType = response.headers.get("content-type");

            if (contentType && contentType.includes("application/json")) {
                return response.json().then(body => {
                    responseData.body = body;
                    responseData.bodyType = 'json';
                    return responseData;
                });
            } else if (contentType && contentType.includes("text/html")) {
                return response.text().then(body => {
                    responseData.body = body;
                    responseData.bodyType = 'html';
                    return responseData;
                });
            } else {
                return response.text().then(body => {
                    responseData.body = body;
                    responseData.bodyType = 'text';
                    try {
                        responseData.body = JSON.parse(body);
                        responseData.bodyType = 'json';
                    } catch (e) {
                        console.log("Response is not JSON, treating as plain text");
                    }
                    return responseData;
                });
            }
        })
        .then(data => {
            displayResponse(data);
        })
        .catch(error => {
            displayError(error);
        })

}

function displayResponse(data) {
    const outputElement = document.getElementById('response-output');
    let bodyContent = '';

    switch (data.bodyType) {
        case 'json':
            bodyContent = `<pre><code class="language-json">${JSON.stringify(data.body, null, 2)}</code></pre>`;
            break;
        case 'html':
            bodyContent = `<pre><code class="language-html">${escapeHtml(data.body)}</code></pre>`;
            break;
        case 'text':
        default:
            bodyContent = `<pre>${escapeHtml(data.body)}</pre>`;
            break;
    }

    outputElement.innerHTML = `
        <h4>Status: ${data.status} ${data.statusText}</h4>
        <h4>Headers:</h4>
        <pre><code class="language-json">${JSON.stringify(data.headers, null, 2)}</code></pre>
        <h4>Body:</h4>
        ${bodyContent}
    `;
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function displayError(error) {
    const outputElement = document.getElementById('response-output');
    outputElement.innerHTML = `<h4>Error:</h4><pre>${escapeHtml(error.toString())}</pre>`;
}

function getHeaders() {
    const headers = {};
    document.querySelectorAll('.header-row').forEach(row => {
        const key = row.querySelector('.header-key').value;
        const value = row.querySelector('.header-value').value;
        if (key && value) {
            headers[key] = value;
        }
    });
    return headers;
}

function getQueryParams() {
    const params = {};
    document.querySelectorAll('.query-row').forEach(row => {
        const key = row.querySelector('.query-key').value;
        const value = row.querySelector('.query-value').value;
        if (key && value) {
            params[key] = value;
        }
    });
    return params;
}

function getAuthData() {
    const authType = document.getElementById('auth-type').value;
    const authData = {};

    if (authType === 'bearer') {
        const token = document.getElementById('auth-token').value;
        if (token) {
            authData['Authorization'] = `Bearer ${token}`;
        }
    } else if (authType === 'basic') {
        const username = document.getElementById('auth-username').value;
        const password = document.getElementById('auth-password').value;
        if (username && password) {
            authData['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
        }
    }

    return authData;
}

function toggleAuthFields() {
    const authType = document.getElementById('auth-type').value;
    document.getElementById('bearer-auth').style.display = authType === 'bearer' ? 'block' : 'none';
    document.getElementById('basic-auth').style.display = authType === 'basic' ? ' flex' : 'none';
}

function initializeHeadersSection() {
    let headerCount = 1;
    const maxHeaders = 10;
    const headerContainer = document.getElementById('headers-section');
    const addHeaderBtn = document.getElementById('add-header');

    const addHeaderRow = () => {
        if (headerCount >= maxHeaders) return;
        const headerRowHTML = `
            <div class="header-row">
                <input type="text" class="header-key" placeholder="Header Key">
                <input type="text" class="header-value" placeholder="Header Value">
                <button class="remove-header">Remove</button>
            </div>
        `;
        headerContainer.insertAdjacentHTML('beforeend', headerRowHTML);
        headerCount++;
        updateHeaderControls();
    };

    const removeHeaderRow = (button) => {
        button.parentElement.remove();
        headerCount--;
        updateHeaderControls();
    };

    const updateHeaderControls = () => {
        addHeaderBtn.style.display = headerCount >= maxHeaders ? 'none' : 'block';
        document.querySelectorAll('.remove-header').forEach(button => {
            button.style.display = headerCount > 1 ? 'inline-block' : 'none';
        });
    };

    addHeaderBtn.addEventListener('click', addHeaderRow);
    headerContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-header')) {
            removeHeaderRow(e.target);
        }
    });

    addHeaderRow();
}

function initializeQuerySection() {
    let queryCount = 1;
    const maxQueries = 15;
    const queryContainer = document.getElementById('query-section');
    const addQueryBtn = document.getElementById('add-query');

    const addQueryRow = () => {
        if (queryCount >= maxQueries) return;
        const queryRowHTML = `
            <div class="query-row">
                <input type="text" class="query-key" placeholder="Key">
                <input type="text" class="query-value" placeholder="Value">
                <button class="remove-query">Remove</button>
            </div>
        `;
        queryContainer.insertAdjacentHTML('beforeend', queryRowHTML);
        queryCount++;
        updateQueryControls();
    };

    const removeQueryRow = (button) => {
        button.parentElement.remove();
        queryCount--;
        updateQueryControls();
    };

    const updateQueryControls = () => {
        addQueryBtn.style.display = queryCount >= maxQueries ? 'none' : 'block';
        document.querySelectorAll('.remove-query').forEach(button => {
            button.style.display = queryCount > 1 ? 'inline-block' : 'none';
        });
    };

    addQueryBtn.addEventListener('click', addQueryRow);
    queryContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-query')) {
            removeQueryRow(e.target);
        }
    });

    addQueryRow();
}

function initializeFormDataSection() {
    let formDataCount = 1;
    const maxFormData = 15;
    const formDataContainer = document.getElementById('form-data-container');
    const addFormDataBtn = document.getElementById('add-form-data');

    const addFormDataRow = () => {
        if (formDataCount >= maxFormData) return;
        const formDataRowHTML = `
            <div class="form-data-row">
                <input type="text" class="form-key" placeholder="Key">
                <select class="form-type">
                    <option value="text">Text</option>
                    <option value="file">File</option>
                </select>
                <input type="text" class="form-value" placeholder="Value">
                <input type="file" class="form-file" style="display: none;">
                <button class="remove-form-data">Remove</button>
            </div>
        `;
        formDataContainer.insertAdjacentHTML('beforeend', formDataRowHTML);
        formDataCount++;
        updateFormDataControls();
    };

    const removeFormDataRow = (button) => {
        button.parentElement.remove();
        formDataCount--;
        updateFormDataControls();
    };

    const updateFormDataRow = (row) => {
        const typeSelect = row.querySelector('.form-type');
        const valueInput = row.querySelector('.form-value');
        const fileInput = row.querySelector('.form-file');

        if (typeSelect.value === 'file') {
            valueInput.style.display = 'none';
            fileInput.style.display = 'inline-block';
        } else {
            valueInput.style.display = 'inline-block';
            fileInput.style.display = 'none';
        }
    };

    const updateFormDataControls = () => {
        addFormDataBtn.style.display = formDataCount >= maxFormData ? 'none' : 'block';
        document.querySelectorAll('.remove-form-data').forEach(button => {
            button.style.display = formDataCount > 1 ? 'inline-block' : 'none';
        });
    };

    addFormDataBtn.addEventListener('click', addFormDataRow);
    formDataContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-form-data')) {
            removeFormDataRow(e.target);
        }
    });

    formDataContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('form-type')) {
            updateFormDataRow(e.target.parentElement);
        }
    });

    addFormDataRow(); // Add initial form data row
}

function openTab(evt, tabName) {
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.style.display = 'none');

    const tabLinks = document.querySelectorAll('.tab-link');
    tabLinks.forEach(link => link.classList.remove('active'));

    document.getElementById(tabName).style.display = 'block';
    evt.currentTarget.classList.add('active');
}

function createNewRequest() {
    const requestList = document.getElementById('request-list');
    const requestName = prompt('Enter a name for the request:');
    if (requestName) {
        const newRequest = document.createElement('li');
        newRequest.textContent = requestName;
        newRequest.setAttribute('data-name', requestName);
        requestList.appendChild(newRequest);

        newRequest.addEventListener('click', () => {
            loadRequest(requestName);
        });

        // Clear current request data
        clearRequestData();
    }
}

function saveCurrentRequest() {
    const requestName = prompt('Enter a name to save this request:');
    if (requestName) {
        const requestData = {
            method: document.getElementById('request-method').value,
            url: document.getElementById('request-url').value,
            headers: getHeaders(),
            queryParams: getQueryParams(),
            authType: document.getElementById('auth-type').value,
            authToken: document.getElementById('auth-token').value,
            authUsername: document.getElementById('auth-username').value,
            authPassword: document.getElementById('auth-password').value,
            contentType: document.getElementById('content-type').value,
            body: document.getElementById('request-body').value
        };

        localStorage.setItem(`request_${requestName}`, JSON.stringify(requestData));

        // Update the request list
        const requestList = document.getElementById('request-list');
        const newRequest = document.createElement('li');
        newRequest.textContent = requestName;
        newRequest.setAttribute('data-name', requestName);
        requestList.appendChild(newRequest);

        newRequest.addEventListener('click', () => {
            loadRequest(requestName);
        });
    }
}

function loadRequest(name) {
    const requestData = JSON.parse(localStorage.getItem(`request_${name}`));
    if (requestData) {
        document.getElementById('request-method').value = requestData.method;
        document.getElementById('request-url').value = requestData.url;
        document.getElementById('auth-type').value = requestData.authType;
        document.getElementById('auth-token').value = requestData.authToken;
        document.getElementById('auth-username').value = requestData.authUsername;
        document.getElementById('auth-password').value = requestData.authPassword;
        document.getElementById('content-type').value = requestData.contentType;
        document.getElementById('request-body').value = requestData.body;

        // Load headers
        const headerContainer = document.getElementById('headers-section');
        headerContainer.innerHTML = '<button id="add-header">Add Header</button>';
        Object.entries(requestData.headers).forEach(([key, value]) => {
            const headerRowHTML = `
                <div class="header-row">
                    <input type="text" class="header-key" value="${key}">
                    <input type="text" class="header-value" value="${value}">
                    <button class="remove-header">Remove</button>
                </div>
            `;
            headerContainer.insertAdjacentHTML('beforeend', headerRowHTML);
        });

        // Load query parameters
        const queryContainer = document.getElementById('query-section');
        queryContainer.innerHTML = '<button id="add-query">Add Query Param</button>';
        Object.entries(requestData.queryParams).forEach(([key, value]) => {
            const queryRowHTML = `
                <div class="query-row">
                    <input type="text" class="query-key" value="${key}">
                    <input type="text" class="query-value" value="${value}">
                    <button class="remove-query">Remove</button>
                </div>
            `;
            queryContainer.insertAdjacentHTML('beforeend', queryRowHTML);
        });

        toggleAuthFields();
    }
}

function loadSavedRequests() {
    const requestList = document.getElementById('request-list');
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('request_')) {
            const requestName = key.replace('request_', '');
            const listItem = document.createElement('li');
            listItem.textContent = requestName;
            listItem.setAttribute('data-name', requestName);
            listItem.addEventListener('click', () => {
                loadRequest(requestName);
            });
            requestList.appendChild(listItem);
        }
    });
}

function clearRequestData() {
    document.getElementById('request-method').value = 'GET';
    document.getElementById('request-url').value = '';
    document.getElementById('auth-type').value = 'none';
    document.getElementById('auth-token').value = '';
    document.getElementById('auth-username').value = '';
    document.getElementById('auth-password').value = '';
    document.getElementById('content-type').value = 'auto';
    document.getElementById('request-body').value = '';

    // Clear headers
    const headerContainer = document.getElementById('headers-section');
    headerContainer.innerHTML = '<button id="add-header">Add Header</button>';

    // Clear query parameters
    const queryContainer = document.getElementById('query-section');
    queryContainer.innerHTML = '<button id="add-query">Add Query Param</button>';

    // Clear form data
    const formDataContainer = document.getElementById('form-data-container');
    formDataContainer.innerHTML = '';

    // Clear response
    document.getElementById('response-output').innerHTML = '';

    toggleAuthFields();
}

document.querySelector('.tab-link').click();