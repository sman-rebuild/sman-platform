export JAVA_HOME=/tmp/jdk/jdk-21.0.13.1+2 PATH=/tmp/jdk/jdk-21.0.13.1+2/bin:$PATH
cd /tmp/rebuild
./node_modules/.bin/firebase emulators:exec --only firestore,auth --project demo-sman-rebuild "node tests/rules.test.js" 2>&1 | grep -v "^i \|^⚠\|^$"
