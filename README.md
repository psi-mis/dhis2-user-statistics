DHIS2 User Statistics
==============
# About
DHIS2 User Statistics serves as an user auditing utility for [DHIS2](https://dhis2.org).

Author: [Gregory Wilson](gwilson@baosystems.com)

Sponsor: [PSI](http://www.psi.org/)

# Setup

In order for this app to work as intended the `User` must have a `User Role` containing `View User Group Managing Relationships` and access to this app itself.

For user groups to show by default on the Dashboard, they need an attribute where the attribute code = 'BATapp_ShowOnDashboard'.

# Features

## Phase 1: Listing (30h) Complete

* Access: List of users who have logged in during the last X days
* Stagnation: List of users who have not logged on in the past X days
* Disabling/Enabling of accounts

## Phase 2: Filtering (40h) Complete

* Filtering by OU             
* Filtering by User Group     
* Filtering by not disabled   
* Filtering by Name           
* Filtering by OU (rolled up)

## Phase 3: Usage (40h)

* Infographic % active logins by group by days, color coded
* Number or status (yes/no) of log-in days within a certain period (eg. user(s) that logged in on at least one day each week).
* Filter groups to just those with a particular attribute
* Infographic % active logins by group by days, color coded

## Phase 4: Activity Tracking

* Most often clicked on item
* How often using feature X

# TODO
* 4: Most often clicked on item
* 4: How often using feature X
* More progress wheels for better user feedback that something is happening
* Bulk inactivation
* Paging of results
* Link from user to account management page (no. sqlview prevented from getting user id)
* Cache the dashboard results to the dataStore

# Building

## Prerequisites
Make sure you have at least the following versions of `node` and `npm`.

+ Node version v5.6.0 or higher
+ npm version 3.8.0 or higher

Use the following commands to check your current versions
```sh
node -v

npm -v
```

## Getting started

Clone the repository from github with the following command
```sh
git clone git@bitbucket.org:baosystems/bat-app.git
```

Install the node dependencies
```sh
npm install
```

To set up your DHIS2 instance to work with the development service you will need to add the development servers address to the CORS whitelist. You can do this within the DHIS2 Settings app under the _access_ tab. On the access tab add `http://localhost:8081` to the CORS Whitelist.
> The starter app will look for a DHIS 2 development instance configuration in
> `$DHIS2_HOME/config`. So for example if your `DHIS2_HOME` environment variable is
> set to `~/.dhis2`, the starter app will look for `~/.dhis2/config.js` and then
> `~/.dhis2/config.json` and load the first one it can find.
>
> The config should export an object with the properties `baseUrl` and
> `authorization`, where authorization is the base64 encoding of your username and
> password. You can obtain this value by opening the console in your browser and
> typing `btoa('user:pass')`.
>
> If no config is found, the default `baseUrl` is `http://localhost:8080/dhis` and
> the default username and password is `admin` and `district`, respectively.
>
> See `webpack.config.js` for details.

This should enable you to run the following node commands:

To run the development server
```sh
npm start
```

To run the tests one time
```sh
npm test
```

To run the tests continuously on file changes (for your BDD workflow)
```sh
npm run test-watch
```

To generate a coverage report for the tests
```sh
npm run coverage
```

To check the code style for both the JS and SCSS files run
```sh
npm run lint
```

## Distributing

To make a DHIS2 app zip file, run:
```sh
npm run-script dist
```
Then load the `build/bat-app.zip` file to your DHIS2 instance.
