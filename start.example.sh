# Set DEBUG to "" to disable logging
export DEBUG="epcal:*"
# User email address
export EPCAL_EMAIL="foo@example.com"
# Base64 encoded user password
# TODO: implement better password encoding
export EPCAL_PASS="SGVsbG8sIHdvcmxkIQ=="

node index.js
