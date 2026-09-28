import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
    vus: 1,
    iterations: 1,
};

const BASE_URL = "http://127.0.0.1:8000/task";

export default function () {

    // --------------------------------------------------
    // 1. REGISTER
    // --------------------------------------------------

    const username = `smoketest_${Date.now()}`;
    const password = "Test@12345";

    const registerPayload = JSON.stringify({
        username: username,
        email: `${username}@example.com`,
        password: password,
        password2: password,
    });

    const registerRes = http.post(
        `${BASE_URL}/register/`,
        registerPayload,
        {
            headers: {
                "Content-Type": "application/json",
            },
        }
    );

    check(registerRes, {
        "Register: status is 201": (r) => r.status === 201,
        "Register: response received": (r) => r.body.length > 0,
    });

    console.log(`Register Status: ${registerRes.status}`);
    console.log(`Register Response: ${registerRes.body}`);


    // --------------------------------------------------
    // 2. LOGIN
    // --------------------------------------------------

    const loginPayload = JSON.stringify({
        username: username,
        password: password,
    });

    const loginRes = http.post(
        `${BASE_URL}/login/`,
        loginPayload,
        {
            headers: {
                "Content-Type": "application/json",
            },
        }
    );

    check(loginRes, {
        "Login: status is 200": (r) => r.status === 200,
        "Login: response received": (r) => r.body.length > 0,
    });

    console.log(`Login Status: ${loginRes.status}`);
    console.log(`Login Response: ${loginRes.body}`);


    // --------------------------------------------------
    // 3. GET TOKENS
    // --------------------------------------------------

    let accessToken = null;
    let refreshToken = null;

    try {
        const loginData = loginRes.json();

        accessToken = loginData.access;
        refreshToken = loginData.refresh;

        check(loginData, {
            "Login: access token exists": (data) => !!data.access,
            "Login: refresh token exists": (data) => !!data.refresh,
        });

    } catch (error) {
        console.error("Could not parse login response as JSON");
        console.error(loginRes.body);
    }


    // --------------------------------------------------
    // 4. REFRESH TOKEN
    // --------------------------------------------------

    if (refreshToken) {

        const refreshPayload = JSON.stringify({
            refresh: refreshToken,
        });

        const refreshRes = http.post(
            `${BASE_URL}/token/refresh/`,
            refreshPayload,
            {
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        check(refreshRes, {
            "Refresh Token: status is 200": (r) => r.status === 200,
            "Refresh Token: new access token exists": (r) => {
                try {
                    return !!r.json().access;
                } catch {
                    return false;
                }
            },
        });

        console.log(`Refresh Status: ${refreshRes.status}`);
        console.log(`Refresh Response: ${refreshRes.body}`);

        try {
            const refreshData = refreshRes.json();

            if (refreshData.access) {
                accessToken = refreshData.access;
            }
        } catch (error) {
            console.error("Could not parse refresh response");
        }
    }



    sleep(1);
}