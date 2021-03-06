import { getRandomString } from '../support/utils'

const beforeEachHook = function () {
  cy.visit('./cypress/integration/index.html').then(async function (win) {
    expect(win).to.have.property('userbase')
    const userbase = win.userbase
    this.currentTest.userbase = userbase

    const { appId, endpoint } = Cypress.env()
    win._userbaseEndpoint = endpoint
    userbase.init({ appId })
  })
}

const signUp = async (userbase) => {
  const username = 'test-user-' + getRandomString()
  const password = getRandomString()

  await userbase.signUp({
    username,
    password,
    rememberMe: 'none'
  })

  return { username, password }
}

describe('DB Sharing Tests', function () {
  const databaseName = 'test-db'

  describe('Get Verification Message', function () {

    describe('Sucess Tests', function () {
      beforeEach(function () { beforeEachHook() })

      it('Default', async function () {
        await signUp(this.test.userbase)

        const result = await this.test.userbase.getVerificationMessage()

        expect(result, 'keys').to.have.key('verificationMessage')
        expect(result.verificationMessage, 'verification message').to.be.a.string

        // clean up
        await this.test.userbase.deleteUser()
      })
    })

    describe('Failure Tests', function () {
      beforeEach(function () { beforeEachHook() })

      it('User not signed in', async function () {
        try {
          await this.test.userbase.getVerificationMessage()
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('UserNotSignedIn')
          expect(e.message, 'error message').to.be.equal('Not signed in.')
          expect(e.status, 'error status').to.be.equal(400)
        }
      })
    })

  })

  describe('Verify User', function () {

    describe('Sucess Tests', function () {
      beforeEach(function () { beforeEachHook() })

      it('Default', async function () {
        // sign up User A to be verified
        const userA = await signUp(this.test.userbase)
        const { verificationMessage } = await this.test.userbase.getVerificationMessage()
        await this.test.userbase.signOut()

        // sign up User B to verify User A
        await signUp(this.test.userbase)
        await this.test.userbase.verifyUser({ verificationMessage })

        // clean up
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: userA.username, password: userA.password })
        await this.test.userbase.deleteUser()
      })

      it('Concurrent with getDatabases()', async function () {
        // sign up User A to be verified
        const userA = await signUp(this.test.userbase)
        const { verificationMessage } = await this.test.userbase.getVerificationMessage()
        await this.test.userbase.signOut()

        // sign up User B to verify User A
        await signUp(this.test.userbase)

        // User B verifies User A while concurrently calling getDatabases()
        await Promise.all([
          this.test.userbase.verifyUser({ verificationMessage }),
          this.test.userbase.getDatabases(),
        ])

        // clean up
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: userA.username, password: userA.password })
        await this.test.userbase.deleteUser()
      })
    })

    describe('Failure Tests', function () {
      beforeEach(function () { beforeEachHook() })

      it('Params must be object', async function () {
        try {
          await this.test.userbase.verifyUser()
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('ParamsMustBeObject')
          expect(e.message, 'error message').to.be.equal('Parameters passed to function must be placed inside an object.')
          expect(e.status, 'error status').to.be.equal(400)
        }
      })

      it('Verification message missing', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.verifyUser({})
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.equal('VerificationMessageMissing')
          expect(e.message, 'error message').to.equal('Verification message missing.')
          expect(e.status, 'error status').to.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Verification message must be string', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.verifyUser({ verificationMessage: 1 })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.equal('VerificationMessageMustBeString')
          expect(e.message, 'error message').to.equal('Verification message must be a string.')
          expect(e.status, 'error status').to.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Verification messasge cannot be blank', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.verifyUser({ verificationMessage: '' })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('VerificationMessageCannotBeBlank')
          expect(e.message, 'error message').to.be.equal('Verification message cannot be blank.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Verification message invalid', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.verifyUser({ verificationMessage: 'abc' })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('VerificationMessageInvalid')
          expect(e.message, 'error message').to.be.equal('Verification message invalid.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Verifying self not allowed', async function () {
        await signUp(this.test.userbase)
        const { verificationMessage } = await this.test.userbase.getVerificationMessage()

        try {
          await this.test.userbase.verifyUser({ verificationMessage })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('VerifyingSelfNotAllowed')
          expect(e.message, 'error message').to.be.equal('Verifying self not allowed. Can only verify other users.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('User not signed in', async function () {
        try {
          await this.test.userbase.verifyUser({ verificationMessage: '123' })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('UserNotSignedIn')
          expect(e.message, 'error message').to.be.equal('Not signed in.')
          expect(e.status, 'error status').to.be.equal(400)
        }
      })
    })

  })

  describe('Share Database', function () {

    describe('Sucess Tests', function () {
      beforeEach(function () { beforeEachHook() })

      it('Default', async function () {
        const recipient = await signUp(this.test.userbase)
        const { verificationMessage } = await this.test.userbase.getVerificationMessage()
        await this.test.userbase.signOut()

        const sender = await signUp(this.test.userbase)
        await this.test.userbase.verifyUser({ verificationMessage })
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        // sender shares database with recipient
        await this.test.userbase.shareDatabase({ databaseName, username: recipient.username })

        // sender inserts item into database
        const testItem = 'hello world!'
        const testItemId = 'test-id'
        await this.test.userbase.insertItem({ databaseName, item: testItem, itemId: testItemId })
        await this.test.userbase.signOut()

        // recipient signs in and checks if can read the database
        await this.test.userbase.signIn({ username: recipient.username, password: recipient.password, rememberMe: 'none' })

        // recipient must find the database's databaseId using getDatabases() result
        const { databases } = await this.test.userbase.getDatabases()
        const db = databases[0]
        const { databaseId } = db

        let changeHandlerCallCount = 0
        const changeHandler = function (items) {
          expect(items, 'array passed to changeHandler').to.be.a('array')
          expect(items, 'array passed to changeHandler').to.deep.equal([{
            itemId: testItemId,
            item: testItem
          }])

          changeHandlerCallCount += 1
        }

        await this.test.userbase.openDatabase({ databaseId, changeHandler })

        expect(changeHandlerCallCount, 'changeHandler called correct number of times').to.equal(1)

        // clean up
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: sender.username, password: sender.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
      })

      it('Default with requireVerified false', async function () {
        const recipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const sender = await signUp(this.test.userbase)
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        // sender shares database with recipient
        await this.test.userbase.shareDatabase({ databaseName, username: recipient.username, requireVerified: false })

        // sender inserts item into database
        const testItem = 'hello world!'
        const testItemId = 'test-id'
        await this.test.userbase.insertItem({ databaseName, item: testItem, itemId: testItemId })
        await this.test.userbase.signOut()

        // recipient signs in and checks if can read the database
        await this.test.userbase.signIn({ username: recipient.username, password: recipient.password, rememberMe: 'none' })

        // recipient must find the database's databaseId using getDatabases() result
        const { databases } = await this.test.userbase.getDatabases()
        const db = databases[0]
        const { databaseId } = db

        let changeHandlerCallCount = 0
        const changeHandler = function (items) {
          expect(items, 'array passed to changeHandler').to.be.a('array')
          expect(items, 'array passed to changeHandler').to.deep.equal([{
            itemId: testItemId,
            item: testItem
          }])

          changeHandlerCallCount += 1
        }

        await this.test.userbase.openDatabase({ databaseId, changeHandler })

        expect(changeHandlerCallCount, 'changeHandler called correct number of times').to.equal(1)

        // clean up
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: sender.username, password: sender.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
      })

      it('readOnly false', async function () {
        const recipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const sender = await signUp(this.test.userbase)
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        // sender shares database with recipient
        await this.test.userbase.shareDatabase({ databaseName, username: recipient.username, requireVerified: false, readOnly: false })
        await this.test.userbase.signOut()

        // recipient signs in and checks if can insert into the database
        await this.test.userbase.signIn({ username: recipient.username, password: recipient.password, rememberMe: 'none' })

        // recipient must find the database's databaseId using getDatabases() result
        const { databases } = await this.test.userbase.getDatabases()
        const db = databases[0]
        const { databaseId } = db

        let recipientChangeHandlerCallCount = 0
        const recipientChangeHandler = function (items) {
          expect(items, 'array passed to changeHandler').to.be.a('array')

          if (recipientChangeHandlerCallCount === 0) {
            expect(items, 'array passed to changeHandler').to.deep.equal([])
          } else {
            expect(items, 'array passed to changeHandler').to.deep.equal([{
              itemId: testItemId,
              item: testItem
            }])
          }

          recipientChangeHandlerCallCount += 1
        }

        await this.test.userbase.openDatabase({ databaseId, changeHandler: recipientChangeHandler })

        // recipient inserts item into database
        const testItem = 'hello world!'
        const testItemId = 'test-id'
        await this.test.userbase.insertItem({ databaseId, item: testItem, itemId: testItemId })

        expect(recipientChangeHandlerCallCount, 'changeHandler called correct number of times').to.equal(2)

        await this.test.userbase.deleteUser()

        // sender should be able to read the item too
        await this.test.userbase.signIn({ username: sender.username, password: sender.password, rememberMe: 'none' })

        let senderChangeHandlerCallCount = 0
        const senderChangeHandler = function (items) {
          expect(items, 'array passed to changeHandler').to.be.a('array')
          expect(items, 'array passed to changeHandler').to.deep.equal([{
            itemId: testItemId,
            item: testItem
          }])

          senderChangeHandlerCallCount += 1
        }
        await this.test.userbase.openDatabase({ databaseName, changeHandler: senderChangeHandler })

        expect(senderChangeHandlerCallCount, 'changeHandler called correct number of times').to.equal(1)

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('resharingAllowed true', async function () {
        const firstRecipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const secondRecipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const sender = await signUp(this.test.userbase)
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        const testItem = 'hello world!'
        const testItemId = 'test-id'
        await this.test.userbase.insertItem({ databaseName, item: testItem, itemId: testItemId })

        // sender shares database with firstRecipient
        await this.test.userbase.shareDatabase({ databaseName, username: firstRecipient.username, requireVerified: false, resharingAllowed: true })
        await this.test.userbase.signOut()

        // firstRecipient signs in and shares database with secondRecipient
        await this.test.userbase.signIn({ username: firstRecipient.username, password: firstRecipient.password, rememberMe: 'none' })

        // firstRecipient must find the database's databaseId using getDatabases() result
        const { databases } = await this.test.userbase.getDatabases()
        const db = databases[0]
        const { databaseId } = db

        // firstRecipient shares database with secondRecipient
        await this.test.userbase.shareDatabase({ databaseId, username: secondRecipient.username, requireVerified: false })
        await this.test.userbase.signOut()

        // secondRecipient should be able to open the database
        await this.test.userbase.signIn({ username: secondRecipient.username, password: secondRecipient.password, rememberMe: 'none' })

        // call getDatabases() so that database key gets set
        await this.test.userbase.getDatabases()

        let changeHandlerCallCount = 0
        const changeHandler = function (items) {
          expect(items, 'array passed to changeHandler').to.be.a('array')
          expect(items, 'array passed to changeHandler').to.deep.equal([{
            itemId: testItemId,
            item: testItem
          }])

          changeHandlerCallCount += 1
        }
        await this.test.userbase.openDatabase({ databaseId, changeHandler })
        expect(changeHandlerCallCount, 'changeHandler called correct number of times').to.equal(1)

        // clean up
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: sender.username, password: sender.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: firstRecipient.username, password: firstRecipient.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
      })

      it('Idempotence', async function () {
        const recipient = await signUp(this.test.userbase)
        const { verificationMessage } = await this.test.userbase.getVerificationMessage()
        await this.test.userbase.signOut()

        const sender = await signUp(this.test.userbase)
        await this.test.userbase.verifyUser({ verificationMessage })
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        // sender shares database with recipient
        await this.test.userbase.shareDatabase({ databaseName, username: recipient.username })
        await this.test.userbase.shareDatabase({ databaseName, username: recipient.username })

        // sender inserts item into database
        const testItem = 'hello world!'
        const testItemId = 'test-id'
        await this.test.userbase.insertItem({ databaseName, item: testItem, itemId: testItemId })
        await this.test.userbase.signOut()

        // recipient signs in and checks if can read the database
        await this.test.userbase.signIn({ username: recipient.username, password: recipient.password, rememberMe: 'none' })

        // recipient must find the database's databaseId using getDatabases() result
        const { databases } = await this.test.userbase.getDatabases()
        const db = databases[0]
        const { databaseId } = db

        let changeHandlerCallCount = 0
        const changeHandler = function (items) {
          expect(items, 'array passed to changeHandler').to.be.a('array')
          expect(items, 'array passed to changeHandler').to.deep.equal([{
            itemId: testItemId,
            item: testItem
          }])

          changeHandlerCallCount += 1
        }

        await this.test.userbase.openDatabase({ databaseId, changeHandler })

        expect(changeHandlerCallCount, 'changeHandler called correct number of times').to.equal(1)

        // clean up
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: sender.username, password: sender.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
      })

      it('Sharing with a user who already has access', async function () {
        const recipient = await signUp(this.test.userbase)
        const { verificationMessage } = await this.test.userbase.getVerificationMessage()
        await this.test.userbase.signOut()

        const sender = await signUp(this.test.userbase)
        await this.test.userbase.verifyUser({ verificationMessage })
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        // sender shares database with recipient
        await this.test.userbase.shareDatabase({ databaseName, username: recipient.username })

        // sender inserts item into database
        const testItem = 'hello world!'
        const testItemId = 'test-id'
        await this.test.userbase.insertItem({ databaseName, item: testItem, itemId: testItemId })
        await this.test.userbase.signOut()

        // recipient signs in and checks if can read the database
        await this.test.userbase.signIn({ username: recipient.username, password: recipient.password, rememberMe: 'none' })

        // recipient must find the database's databaseId using getDatabases() result
        const { databases } = await this.test.userbase.getDatabases()
        const db = databases[0]
        const { databaseId } = db

        // sender tries to share with recipient again
        await this.test.userbase.signOut()
        await this.test.userbase.signIn({ username: sender.username, password: sender.password, rememberMe: 'none' })
        await this.test.userbase.shareDatabase({ databaseName, username: recipient.username })
        await this.test.userbase.signOut()

        // should have made no difference
        await this.test.userbase.signIn({ username: recipient.username, password: recipient.password, rememberMe: 'none' })

        let changeHandlerCallCount = 0
        const changeHandler = function (items) {
          expect(items, 'array passed to changeHandler').to.be.a('array')
          expect(items, 'array passed to changeHandler').to.deep.equal([{
            itemId: testItemId,
            item: testItem
          }])

          changeHandlerCallCount += 1
        }

        await this.test.userbase.openDatabase({ databaseId, changeHandler })

        expect(changeHandlerCallCount, 'changeHandler called correct number of times').to.equal(1)

        // clean up
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: sender.username, password: sender.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
      })

      it('Both users can see that the other has access', async function () {
        const recipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const sender = await signUp(this.test.userbase)
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        // sender shares database with recipient
        await this.test.userbase.shareDatabase({ databaseName, username: recipient.username, requireVerified: false })
        await this.test.userbase.signOut()

        // recipient signs in and checks to make sure can see the database was sent by sender
        await this.test.userbase.signIn({ username: recipient.username, password: recipient.password, rememberMe: 'none' })
        const { databases } = await this.test.userbase.getDatabases()
        const recipientDatabase = databases[0]
        const { databaseId } = recipientDatabase

        expect(recipientDatabase, 'recipient databases').to.deep.equal({
          databaseName,
          databaseId,
          isOwner: false,
          receivedFromUsername: sender.username,
          readOnly: true,
          resharingAllowed: false,
          users: [{
            username: sender.username,
            isOwner: true,
            readOnly: false,
            resharingAllowed: true,
          }]
        })

        await this.test.userbase.signOut()

        // sender signs back in to make sure recipient has access
        await this.test.userbase.signIn({ username: sender.username, password: sender.password, rememberMe: 'none' })
        const senderDatabases = await this.test.userbase.getDatabases()
        const senderDatabase = senderDatabases.databases[0]

        expect(senderDatabase, 'sender databases').to.deep.equal({
          databaseName,
          isOwner: true,
          readOnly: false,
          resharingAllowed: true,
          users: [{
            username: recipient.username,
            receivedFromUsername: sender.username,
            isOwner: false,
            readOnly: true,
            resharingAllowed: false,
          }]
        })

        // clean up
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: recipient.username, password: recipient.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
      })

      it('Sender deletes self', async function () {
        const recipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        await signUp(this.test.userbase)
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        // sender shares database with recipient then deletes self
        await this.test.userbase.shareDatabase({ databaseName, username: recipient.username, requireVerified: false })
        await this.test.userbase.deleteUser()

        // recipient signs in and should not be able to see the database
        await this.test.userbase.signIn({ username: recipient.username, password: recipient.password, rememberMe: 'none' })
        const { databases } = await this.test.userbase.getDatabases()

        expect(databases, 'databases array ').to.have.lengthOf(0)

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('First recipient deletes self after sharing with a second recipient', async function () {
        const firstRecipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const secondRecipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const sender = await signUp(this.test.userbase)
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        // sender shares database with firstRecipient
        await this.test.userbase.shareDatabase({ databaseName, username: firstRecipient.username, requireVerified: false, resharingAllowed: true })
        await this.test.userbase.signOut()

        // firstRecipient signs in and shares database with secondRecipient
        await this.test.userbase.signIn({ username: firstRecipient.username, password: firstRecipient.password, rememberMe: 'none' })

        // firstRecipient must find the database's databaseId using getDatabases() result
        const { databases } = await this.test.userbase.getDatabases()
        const db = databases[0]
        const { databaseId } = db

        // firstRecipient shares database with secondRecipient and deletes self
        await this.test.userbase.shareDatabase({ databaseId, username: secondRecipient.username, requireVerified: false })
        await this.test.userbase.deleteUser()

        // secondRecipient should be able to see the database
        await this.test.userbase.signIn({ username: secondRecipient.username, password: secondRecipient.password, rememberMe: 'none' })

        // call getDatabases() to make sure firstRecipient does not show up in result
        const secondDatabasesResult = await this.test.userbase.getDatabases()

        expect(secondDatabasesResult, 'second recipient databases').to.deep.equal({
          databases: [{
            databaseName,
            databaseId,
            isOwner: false,
            readOnly: true,
            resharingAllowed: false,
            users: [{
              username: sender.username,
              isOwner: true,
              readOnly: false,
              resharingAllowed: true,
            }]
          }]
        })

        // clean up
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: sender.username, password: sender.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
      })

      it('First recipient deletes self after sharing with a second recipient (testing verification process)', async function () {
        const firstRecipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const secondRecipient = await signUp(this.test.userbase)
        const { verificationMessage } = await this.test.userbase.getVerificationMessage()
        await this.test.userbase.signOut()

        const sender = await signUp(this.test.userbase)
        await this.test.userbase.verifyUser({ verificationMessage })
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        // sender shares database with firstRecipient
        await this.test.userbase.shareDatabase({ databaseName, username: firstRecipient.username, requireVerified: false, resharingAllowed: true })
        await this.test.userbase.signOut()

        // firstRecipient signs in and shares database with secondRecipient
        await this.test.userbase.signIn({ username: firstRecipient.username, password: firstRecipient.password, rememberMe: 'none' })

        // firstRecipient must find the database's databaseId using getDatabases() result
        const { databases } = await this.test.userbase.getDatabases()
        const db = databases[0]
        const { databaseId } = db

        // firstRecipient shares database with secondRecipient and deletes self
        await this.test.userbase.shareDatabase({ databaseId, username: secondRecipient.username, requireVerified: false })
        await this.test.userbase.deleteUser()

        // secondRecipient accepts access to database
        await this.test.userbase.signIn({ username: secondRecipient.username, password: secondRecipient.password, rememberMe: 'none' })
        await this.test.userbase.getDatabases()
        await this.test.userbase.signOut()

        // secondRecipient should be verified by sender
        await this.test.userbase.signIn({ username: sender.username, password: sender.password, rememberMe: 'none' })
        const senderDatabasesResult = await this.test.userbase.getDatabases()

        expect(senderDatabasesResult, 'sender databases').to.deep.equal({
          databases: [{
            databaseName,
            isOwner: true,
            readOnly: false,
            resharingAllowed: true,
            users: [{
              username: secondRecipient.username,
              verified: true,
              isOwner: false,
              readOnly: true,
              resharingAllowed: false,
            }]
          }]
        })

        // clean up
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: secondRecipient.username, password: secondRecipient.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
      })

    })

    describe('Failure Tests', function () {
      beforeEach(function () { beforeEachHook() })

      it('User not verified', async function () {
        const recipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        // sign up sender
        await signUp(this.test.userbase)
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        // sender tries to share database with recipient
        try {
          await this.test.userbase.shareDatabase({ databaseName, username: recipient.username })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('UserNotVerified')
          expect(e.message, 'error message').to.be.equal('User not verified. Either verify user before sharing database, or set requireVerified to true.')
          expect(e.status, 'error status').to.be.equal(403)
        }

        // clean up
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: recipient.username, password: recipient.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
      })

      it('User must be reverified', async function () {
        const recipient = await signUp(this.test.userbase)
        const { verificationMessage } = await this.test.userbase.getVerificationMessage()

        // change username, verification message should be different
        const updatedUsername = recipient.username + '-updated'
        await this.test.userbase.updateUser({ username: updatedUsername })
        await this.test.userbase.signOut()

        // sign up sender
        await signUp(this.test.userbase)

        // verify user with old verificationMessage
        await this.test.userbase.verifyUser({ verificationMessage })
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        // sender tries to share database with recipient
        try {
          await this.test.userbase.shareDatabase({ databaseName, username: updatedUsername })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('UserMustBeReverified')
          expect(e.message, 'error message').to.be.equal('User must be reverified.')
          expect(e.status, 'error status').to.be.equal(403)
        }

        // clean up
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: updatedUsername, password: recipient.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
      })

      it('Database is read only', async function () {
        const recipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const sender = await signUp(this.test.userbase)
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        const testItem = 'hello world!'
        const testItemId = 'test-id'
        await this.test.userbase.insertItem({ databaseName, item: testItem, itemId: testItemId })

        // sender shares database with recipient
        await this.test.userbase.shareDatabase({ databaseName, username: recipient.username, requireVerified: false })
        await this.test.userbase.signOut()

        // recipient signs in and checks if can insert into the database
        await this.test.userbase.signIn({ username: recipient.username, password: recipient.password, rememberMe: 'none' })

        // recipient must find the database's databaseId using getDatabases() result
        const { databases } = await this.test.userbase.getDatabases()
        const db = databases[0]
        const { databaseId } = db

        await this.test.userbase.openDatabase({ databaseId, changeHandler: () => { } })

        const expectedError = (e) => {
          expect(e.name, 'error name').to.be.equal('DatabaseIsReadOnly')
          expect(e.message, 'error message').to.be.equal('Database is read only. Must have permission to write to database.')
          expect(e.status, 'error status').to.be.equal(403)
        }

        // recipient tries to insert, update, delete, putTransaction into database
        try {
          await this.test.userbase.insertItem({ databaseId, item: testItem })
          throw new Error('Should have failed')
        } catch (e) {
          expectedError(e)
        }

        try {
          await this.test.userbase.updateItem({ databaseId, item: testItem, itemId: testItemId })
          throw new Error('Should have failed')
        } catch (e) {
          expectedError(e)
        }

        try {
          await this.test.userbase.deleteItem({ databaseId, item: testItem, itemId: testItemId })
          throw new Error('Should have failed')
        } catch (e) {
          expectedError(e)
        }

        try {
          await this.test.userbase.putTransaction({ databaseId, operations: [{ command: 'Insert', item: testItem, itemId: testItemId }] })
          throw new Error('Should have failed')
        } catch (e) {
          expectedError(e)
        }

        // clean up
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: sender.username, password: sender.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
      })

      it('Resharing not allowed', async function () {
        const firstRecipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const secondRecipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const sender = await signUp(this.test.userbase)
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        // sender shares database with firstRecipient
        await this.test.userbase.shareDatabase({ databaseName, username: firstRecipient.username, requireVerified: false })
        await this.test.userbase.signOut()

        // recipient signs in and shares database with secondRecipient
        await this.test.userbase.signIn({ username: firstRecipient.username, password: firstRecipient.password, rememberMe: 'none' })

        // firstRecipient must find the database's databaseId using getDatabases() result
        const { databases } = await this.test.userbase.getDatabases()
        const db = databases[0]
        const { databaseId } = db

        // firstRecipient tries to share database with secondRecipient
        try {
          await this.test.userbase.shareDatabase({ databaseId, username: secondRecipient.username, requireVerified: false })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('ResharingNotAllowed')
          expect(e.message, 'error message').to.be.equal('Resharing not allowed. Must have permission to reshare the database with another user.')
          expect(e.status, 'error status').to.be.equal(403)
        }

        // clean up
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: sender.username, password: sender.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: secondRecipient.username, password: secondRecipient.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
      })

      it('Resharing with write access not allowed', async function () {
        const firstRecipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const secondRecipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const sender = await signUp(this.test.userbase)
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        // sender shares database with firstRecipient
        await this.test.userbase.shareDatabase({ databaseName, username: firstRecipient.username, requireVerified: false, resharingAllowed: true })
        await this.test.userbase.signOut()

        // recipient signs in and shares database with secondRecipient
        await this.test.userbase.signIn({ username: firstRecipient.username, password: firstRecipient.password, rememberMe: 'none' })

        // firstRecipient must find the database's databaseId using getDatabases() result
        const { databases } = await this.test.userbase.getDatabases()
        const db = databases[0]
        const { databaseId } = db

        // firstRecipient tries to share database with secondRecipient
        try {
          await this.test.userbase.shareDatabase({ databaseId, username: secondRecipient.username, requireVerified: false, readOnly: false })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('ResharingWithWriteAccessNotAllowed')
          expect(e.message, 'error message').to.be.equal('Resharing with write access not allowed. Must have permission to write to the database to reshare the database with write access another user.')
          expect(e.status, 'error status').to.be.equal(403)
        }

        // clean up
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: sender.username, password: sender.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: secondRecipient.username, password: secondRecipient.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
      })

      it('Sharing with self not allowed', async function () {
        const sender = await signUp(this.test.userbase)
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        // sender tries to share database with self
        try {
          await this.test.userbase.shareDatabase({ databaseName, username: sender.username, requireVerified: false })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('SharingWithSelfNotAllowed')
          expect(e.message, 'error message').to.be.equal('Sharing database with self is not allowed. Must share database with another user.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('User not found', async function () {
        await signUp(this.test.userbase)
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        // sender tries to share database with non-existent user
        try {
          await this.test.userbase.shareDatabase({ databaseName, username: 'fake-user', requireVerified: false })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('UserNotFound')
          expect(e.message, 'error message').to.be.equal('User not found.')
          expect(e.status, 'error status').to.be.equal(404)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Database not found - does not exist', async function () {
        const recipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        // sign up sender
        await signUp(this.test.userbase)

        // sender tries to share non-existent database
        try {
          await this.test.userbase.shareDatabase({ databaseName, username: recipient.username, requireVerified: false })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('DatabaseNotFound')
          expect(e.message, 'error message').to.be.equal('Database not found. Find available databases using getDatabases().')
          expect(e.status, 'error status').to.be.equal(404)
        }

        // clean up
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: recipient.username, password: recipient.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
      })

      it('Database not found - recipient tries to open before calling getDatabases()', async function () {
        const firstRecipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const secondRecipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const sender = await signUp(this.test.userbase)
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        // sender shares database with firstRecipient
        await this.test.userbase.shareDatabase({ databaseName, username: firstRecipient.username, requireVerified: false, resharingAllowed: true })
        await this.test.userbase.signOut()

        // recipient signs in and shares database with secondRecipient
        await this.test.userbase.signIn({ username: firstRecipient.username, password: firstRecipient.password, rememberMe: 'none' })

        // firstRecipient must find the database's databaseId using getDatabases() result
        const { databases } = await this.test.userbase.getDatabases()
        const db = databases[0]
        const { databaseId } = db

        // firstRecipient shares database with secondRecipient
        await this.test.userbase.shareDatabase({ databaseId, username: secondRecipient.username, requireVerified: false })
        await this.test.userbase.signOut()

        // secondRecipient will not be able to open database because needs to call getDatabases() first
        await this.test.userbase.signIn({ username: secondRecipient.username, password: secondRecipient.password, rememberMe: 'none' })

        try {
          await this.test.userbase.openDatabase({ databaseId, changeHandler: () => { } })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('DatabaseNotFound')
          expect(e.message, 'error message').to.be.equal('Database not found. Find available databases using getDatabases().')
          expect(e.status, 'error status').to.be.equal(404)
        }

        // clean up
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: sender.username, password: sender.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: firstRecipient.username, password: firstRecipient.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
      })

      it('Params must be object', async function () {
        try {
          await this.test.userbase.shareDatabase()
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('ParamsMustBeObject')
          expect(e.message, 'error message').to.be.equal('Parameters passed to function must be placed inside an object.')
          expect(e.status, 'error status').to.be.equal(400)
        }
      })

      it('Database name missing', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.shareDatabase({ username: 'fake-user' })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('DatabaseNameMissing')
          expect(e.message, 'error message').to.be.equal('Database name missing.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Database name must be string', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.shareDatabase({ databaseName: 1, username: 'fake-user' })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('DatabaseNameMustBeString')
          expect(e.message, 'error message').to.be.equal('Database name must be a string.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Database name cannot be blank', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.shareDatabase({ databaseName: '', username: 'fake-user' })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('DatabaseNameCannotBeBlank')
          expect(e.message, 'error message').to.be.equal('Database name cannot be blank.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Database name too long', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.shareDatabase({ databaseName: 'a'.repeat(51), username: 'fake-user' })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.equal('DatabaseNameTooLong')
          expect(e.message, 'error message').to.equal('Database name cannot be more than 50 characters.')
          expect(e.status, 'error status').to.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Database name restricted', async function () {
        const verifiedUsersDatabaseName = '__userbase_verified_users'

        await signUp(this.test.userbase)

        try {
          await this.test.userbase.shareDatabase({ databaseName: verifiedUsersDatabaseName, username: 'fake-user' })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.equal('DatabaseNameRestricted')
          expect(e.message, 'error message').to.equal(`Database name '${verifiedUsersDatabaseName}' is restricted. It is used internally by userbase-js.`)
          expect(e.status, 'error status').to.equal(403)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Database id must be string', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.shareDatabase({ databaseId: 1, username: 'fake-user' })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.equal('DatabaseIdMustBeString')
          expect(e.message, 'error message').to.equal('Database id must be a string.')
          expect(e.status, 'error status').to.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Database id cannot be blank', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.shareDatabase({ databaseId: '', username: 'fake-user' })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('DatabaseIdCannotBeBlank')
          expect(e.message, 'error message').to.be.equal('Database id cannot be blank.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Database id not allowed', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.shareDatabase({ databaseId: 'abc', databaseName, username: 'fake-user' })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('DatabaseIdNotAllowed')
          expect(e.message, 'error message').to.be.equal('Database id not allowed. Cannot provide both databaseName and databaseId, can only provide one.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Database id invalid length', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.shareDatabase({ databaseId: 'abc', username: 'fake-user' })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('DatabaseIdInvalidLength')
          expect(e.message, 'error message').to.be.equal('Database id invalid length. Must be 36 characters.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Username missing', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.shareDatabase({ databaseName })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('UsernameMissing')
          expect(e.message, 'error message').to.be.equal('Username missing.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Username cannot be blank', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.shareDatabase({ databaseName, username: '' })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('UsernameCannotBeBlank')
          expect(e.message, 'error message').to.be.equal('Username cannot be blank.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Username must be string', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.shareDatabase({ databaseName, username: 1 })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('UsernameMustBeString')
          expect(e.message, 'error message').to.be.equal('Username must be a string.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Read Only must be boolean', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.shareDatabase({ databaseName, username: 'fake-user', readOnly: 'not boolean' })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('ReadOnlyMustBeBoolean')
          expect(e.message, 'error message').to.be.equal('Read only value must be a boolean.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Resharing allowed must be boolean', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.shareDatabase({ databaseName, username: 'fake-user', resharingAllowed: 'not boolean' })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('ResharingAllowedMustBeBoolean')
          expect(e.message, 'error message').to.be.equal('Resharing allowed value must be a boolean.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Require verified must be boolean', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.shareDatabase({ databaseName, username: 'fake-user', requireVerified: 'not boolean' })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('RequireVerifiedMustBeBoolean')
          expect(e.message, 'error message').to.be.equal('Require verified value must be a boolean.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('User not signed in', async function () {
        try {
          await this.test.userbase.shareDatabase({ databaseName, username: 'fake-user' })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('UserNotSignedIn')
          expect(e.message, 'error message').to.be.equal('Not signed in.')
          expect(e.status, 'error status').to.be.equal(400)
        }
      })

    })

  })

  describe('Modify Database Permissions', function () {

    describe('Sucess Tests', function () {
      beforeEach(function () { beforeEachHook() })

      it('readOnly from true to false', async function () {
        const recipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const sender = await signUp(this.test.userbase)
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        // sender shares database with recipient with readOnly true, then modifies to readOnly false
        await this.test.userbase.shareDatabase({ databaseName, username: recipient.username, requireVerified: false, readOnly: true })
        await this.test.userbase.modifyDatabasePermissions({ databaseName, username: recipient.username, readOnly: false })
        await this.test.userbase.signOut()

        // recipient signs in and checks if can insert into the database
        await this.test.userbase.signIn({ username: recipient.username, password: recipient.password, rememberMe: 'none' })

        // recipient must find the database's databaseId using getDatabases() result
        const { databases } = await this.test.userbase.getDatabases()
        const db = databases[0]
        const { databaseId } = db

        let recipientChangeHandlerCallCount = 0
        const recipientChangeHandler = function (items) {
          expect(items, 'array passed to changeHandler').to.be.a('array')

          if (recipientChangeHandlerCallCount === 0) {
            expect(items, 'array passed to changeHandler').to.deep.equal([])
          } else {
            expect(items, 'array passed to changeHandler').to.deep.equal([{
              itemId: testItemId,
              item: testItem
            }])
          }

          recipientChangeHandlerCallCount += 1
        }

        await this.test.userbase.openDatabase({ databaseId, changeHandler: recipientChangeHandler })

        // recipient inserts item into database
        const testItem = 'hello world!'
        const testItemId = 'test-id'
        await this.test.userbase.insertItem({ databaseId, item: testItem, itemId: testItemId })

        expect(recipientChangeHandlerCallCount, 'changeHandler called correct number of times').to.equal(2)

        await this.test.userbase.deleteUser()

        // sender should be able to read the item too
        await this.test.userbase.signIn({ username: sender.username, password: sender.password, rememberMe: 'none' })

        let senderChangeHandlerCallCount = 0
        const senderChangeHandler = function (items) {
          expect(items, 'array passed to changeHandler').to.be.a('array')
          expect(items, 'array passed to changeHandler').to.deep.equal([{
            itemId: testItemId,
            item: testItem
          }])

          senderChangeHandlerCallCount += 1
        }
        await this.test.userbase.openDatabase({ databaseName, changeHandler: senderChangeHandler })

        expect(senderChangeHandlerCallCount, 'changeHandler called correct number of times').to.equal(1)

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('readOnly from false to true', async function () {
        const recipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const sender = await signUp(this.test.userbase)
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        // sender inserts item into database
        const testItem = 'hello world!'
        const testItemId = 'test-id'
        await this.test.userbase.insertItem({ databaseName, item: testItem, itemId: testItemId })

        // sender shares database with recipient with readOnly true, then modifies to readOnly false
        await this.test.userbase.shareDatabase({ databaseName, username: recipient.username, requireVerified: false, readOnly: false })
        await this.test.userbase.modifyDatabasePermissions({ databaseName, username: recipient.username, readOnly: true })
        await this.test.userbase.signOut()

        // recipient signs in and makes sure can't insert into the database
        await this.test.userbase.signIn({ username: recipient.username, password: recipient.password, rememberMe: 'none' })

        // recipient must find the database's databaseId using getDatabases() result
        const { databases } = await this.test.userbase.getDatabases()
        const db = databases[0]
        const { databaseId } = db

        await this.test.userbase.openDatabase({ databaseId, changeHandler: () => { } })

        const expectedError = (e) => {
          expect(e.name, 'error name').to.be.equal('DatabaseIsReadOnly')
          expect(e.message, 'error message').to.be.equal('Database is read only. Must have permission to write to database.')
          expect(e.status, 'error status').to.be.equal(403)
        }

        // recipient tries to insert, update, delete, putTransaction into database
        try {
          await this.test.userbase.insertItem({ databaseId, item: testItem })
          throw new Error('Should have failed')
        } catch (e) {
          expectedError(e)
        }

        try {
          await this.test.userbase.updateItem({ databaseId, item: testItem, itemId: testItemId })
          throw new Error('Should have failed')
        } catch (e) {
          expectedError(e)
        }

        try {
          await this.test.userbase.deleteItem({ databaseId, item: testItem, itemId: testItemId })
          throw new Error('Should have failed')
        } catch (e) {
          expectedError(e)
        }

        try {
          await this.test.userbase.putTransaction({ databaseId, operations: [{ command: 'Insert', item: testItem, itemId: testItemId }] })
          throw new Error('Should have failed')
        } catch (e) {
          expectedError(e)
        }

        await this.test.userbase.deleteUser()

        // sender should be able to read the item too
        await this.test.userbase.signIn({ username: sender.username, password: sender.password, rememberMe: 'none' })

        let senderChangeHandlerCallCount = 0
        const senderChangeHandler = function (items) {
          expect(items, 'array passed to changeHandler').to.be.a('array')
          expect(items, 'array passed to changeHandler').to.deep.equal([{
            item: testItem,
            itemId: testItemId
          }])

          senderChangeHandlerCallCount += 1
        }
        await this.test.userbase.openDatabase({ databaseName, changeHandler: senderChangeHandler })

        expect(senderChangeHandlerCallCount, 'changeHandler called correct number of times').to.equal(1)

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('resharingAllowed from false to true', async function () {
        const firstRecipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const secondRecipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const sender = await signUp(this.test.userbase)
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        const testItem = 'hello world!'
        const testItemId = 'test-id'
        await this.test.userbase.insertItem({ databaseName, item: testItem, itemId: testItemId })

        // sender shares database with firstRecipient
        await this.test.userbase.shareDatabase({ databaseName, username: firstRecipient.username, requireVerified: false, resharingAllowed: false })
        await this.test.userbase.modifyDatabasePermissions({ databaseName, username: firstRecipient.username, resharingAllowed: true })
        await this.test.userbase.signOut()

        // recipient signs in and shares database with secondRecipient
        await this.test.userbase.signIn({ username: firstRecipient.username, password: firstRecipient.password, rememberMe: 'none' })

        // firstRecipient must find the database's databaseId using getDatabases() result
        const { databases } = await this.test.userbase.getDatabases()
        const db = databases[0]
        const { databaseId } = db

        // firstRecipient shares database with secondRecipient
        await this.test.userbase.shareDatabase({ databaseId, username: secondRecipient.username, requireVerified: false })
        await this.test.userbase.signOut()

        // secondRecipient should be able to open the database
        await this.test.userbase.signIn({ username: secondRecipient.username, password: secondRecipient.password, rememberMe: 'none' })

        // call getDatabases() so that database key gets set
        await this.test.userbase.getDatabases()

        let changeHandlerCallCount = 0
        const changeHandler = function (items) {
          expect(items, 'array passed to changeHandler').to.be.a('array')
          expect(items, 'array passed to changeHandler').to.deep.equal([{
            itemId: testItemId,
            item: testItem
          }])

          changeHandlerCallCount += 1
        }
        await this.test.userbase.openDatabase({ databaseId, changeHandler })
        expect(changeHandlerCallCount, 'changeHandler called correct number of times').to.equal(1)

        // clean up
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: sender.username, password: sender.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: firstRecipient.username, password: firstRecipient.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
      })

      it('resharingAllowed from true to false', async function () {
        const firstRecipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const secondRecipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const sender = await signUp(this.test.userbase)
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        // sender shares database with firstRecipient
        await this.test.userbase.shareDatabase({ databaseName, username: firstRecipient.username, requireVerified: false, resharingAllowed: true })
        await this.test.userbase.modifyDatabasePermissions({ databaseName, username: firstRecipient.username, resharingAllowed: false })
        await this.test.userbase.signOut()

        // recipient signs in and shares database with secondRecipient
        await this.test.userbase.signIn({ username: firstRecipient.username, password: firstRecipient.password, rememberMe: 'none' })

        // firstRecipient must find the database's databaseId using getDatabases() result
        const { databases } = await this.test.userbase.getDatabases()
        const db = databases[0]
        const { databaseId } = db

        // firstRecipient tries to share database with secondRecipient
        try {
          await this.test.userbase.shareDatabase({ databaseId, username: secondRecipient.username, requireVerified: false })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('ResharingNotAllowed')
          expect(e.message, 'error message').to.be.equal('Resharing not allowed. Must have permission to reshare the database with another user.')
          expect(e.status, 'error status').to.be.equal(403)
        }

        // clean up
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: sender.username, password: sender.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: secondRecipient.username, password: secondRecipient.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
      })

      it('revoke', async function () {
        const recipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const sender = await signUp(this.test.userbase)
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        // sender shares database with recipient with readOnly true, then modifies to readOnly false
        await this.test.userbase.shareDatabase({ databaseName, username: recipient.username, requireVerified: false, readOnly: true })
        await this.test.userbase.modifyDatabasePermissions({ databaseName, username: recipient.username, revoke: true })

        // sender should not have any users with access to database
        const databasesResult = await this.test.userbase.getDatabases()
        expect(databasesResult.databases[0].users, 'databases users array').to.deep.equal([])

        await this.test.userbase.signOut()

        // recipient signs in and should not see database in response to getDatabases()
        await this.test.userbase.signIn({ username: recipient.username, password: recipient.password, rememberMe: 'none' })
        const { databases } = await this.test.userbase.getDatabases()
        expect(databases, 'databases array').to.deep.equal([])

        // clean up
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: sender.username, password: sender.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
      })

    })

    describe('Failure Tests', function () {
      beforeEach(function () { beforeEachHook() })

      it('Modifying own permissions not allowed', async function () {
        const sender = await signUp(this.test.userbase)
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        try {
          await this.test.userbase.modifyDatabasePermissions({ databaseName, username: sender.username, readOnly: false })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('ModifyingOwnPermissionsNotAllowed')
          expect(e.message, 'error message').to.be.equal("Modifying own database permissions not allowed. Must modify another user's permissions.")
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Modifying owner permissions not allowed', async function () {
        const recipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const sender = await signUp(this.test.userbase)
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        // sender shares database with recipient with full permissions
        await this.test.userbase.shareDatabase({ databaseName, username: recipient.username, requireVerified: false, resharingAllowed: true, readOnly: false })
        await this.test.userbase.signOut()

        // recipient signs in and attempts to modify owner permissions
        await this.test.userbase.signIn({ username: recipient.username, password: recipient.password, rememberMe: 'none' })

        // recipient must find the database's databaseId using getDatabases() result
        const { databases } = await this.test.userbase.getDatabases()
        const db = databases[0]
        const { databaseId } = db

        try {
          // secondRecipient does not have permission to modify firstRecipient's permissions
          await this.test.userbase.modifyDatabasePermissions({ databaseId, username: sender.username, readOnly: false })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('ModifyingOwnerPermissionsNotAllowed')
          expect(e.message, 'error message').to.be.equal("Modifying the owner of a database's permissions is not allowed.")
          expect(e.status, 'error status').to.be.equal(403)
        }

        // clean up
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: sender.username, password: sender.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
      })

      it('Modifying other users permissions not allowed', async function () {
        const firstRecipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const secondRecipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const sender = await signUp(this.test.userbase)
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        const testItem = 'hello world!'
        const testItemId = 'test-id'
        await this.test.userbase.insertItem({ databaseName, item: testItem, itemId: testItemId })

        // sender shares database with firstRecipient
        await this.test.userbase.shareDatabase({ databaseName, username: firstRecipient.username, requireVerified: false, resharingAllowed: true })
        await this.test.userbase.signOut()

        // firstRecipient signs in and shares database with secondRecipient with resharingAllowed set to false
        await this.test.userbase.signIn({ username: firstRecipient.username, password: firstRecipient.password, rememberMe: 'none' })

        // firstRecipient must find the database's databaseId using getDatabases() result
        const { databases } = await this.test.userbase.getDatabases()
        const db = databases[0]
        const { databaseId } = db

        // firstRecipient shares database with secondRecipient
        await this.test.userbase.shareDatabase({ databaseId, username: secondRecipient.username, requireVerified: false, resharingAllowed: false })
        await this.test.userbase.signOut()

        // secondRecipient should not be able to modify firstRecipient's permissions
        await this.test.userbase.signIn({ username: secondRecipient.username, password: secondRecipient.password, rememberMe: 'none' })

        // call getDatabases() so that database key gets set
        await this.test.userbase.getDatabases()

        try {
          // secondRecipient does not have permission to modify firstRecipient's permissions
          await this.test.userbase.modifyDatabasePermissions({ databaseId, username: firstRecipient.username, readOnly: false })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('ModifyingPermissionsNotAllowed')
          expect(e.message, 'error message').to.be.equal("Modifying another user's permissions is not allowed. Must have permission to reshare the database with another user.")
          expect(e.status, 'error status').to.be.equal(403)
        }

        // clean up
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: sender.username, password: sender.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: firstRecipient.username, password: firstRecipient.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
      })

      it('Cannot grant write access', async function () {
        const firstRecipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const secondRecipient = await signUp(this.test.userbase)
        await this.test.userbase.signOut()

        const sender = await signUp(this.test.userbase)
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        const testItem = 'hello world!'
        const testItemId = 'test-id'
        await this.test.userbase.insertItem({ databaseName, item: testItem, itemId: testItemId })

        // sender shares database with firstRecipient
        await this.test.userbase.shareDatabase({ databaseName, username: firstRecipient.username, requireVerified: false, resharingAllowed: true, readOnly: true })
        await this.test.userbase.signOut()

        // firstRecipient signs in and shares database with secondRecipient with resharingAllowed set to true and readOnly true
        await this.test.userbase.signIn({ username: firstRecipient.username, password: firstRecipient.password, rememberMe: 'none' })

        // firstRecipient must find the database's databaseId using getDatabases() result
        const { databases } = await this.test.userbase.getDatabases()
        const db = databases[0]
        const { databaseId } = db

        // firstRecipient shares database with secondRecipient
        await this.test.userbase.shareDatabase({ databaseId, username: secondRecipient.username, requireVerified: false, resharingAllowed: true, readOnly: true })
        await this.test.userbase.signOut()

        // secondRecipient should not be able to grant write access to firstRecipient
        await this.test.userbase.signIn({ username: secondRecipient.username, password: secondRecipient.password, rememberMe: 'none' })

        // call getDatabases() so that database key gets set
        await this.test.userbase.getDatabases()

        try {
          // secondRecipient does not have permission to grant firstRecipient write access
          await this.test.userbase.modifyDatabasePermissions({ databaseId, username: firstRecipient.username, readOnly: false })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('GrantingWriteAccessNotAllowed')
          expect(e.message, 'error message').to.be.equal('Granting write access not allowed. Must have permission to write to the database to grant write access to another user.')
          expect(e.status, 'error status').to.be.equal(403)
        }

        // clean up
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: sender.username, password: sender.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
        await this.test.userbase.signIn({ username: firstRecipient.username, password: firstRecipient.password, rememberMe: 'none' })
        await this.test.userbase.deleteUser()
      })

      it('User not found', async function () {
        await signUp(this.test.userbase)
        await this.test.userbase.openDatabase({ databaseName, changeHandler: () => { } })

        // sender tries to modify non-existent user permissions
        try {
          await this.test.userbase.modifyDatabasePermissions({ databaseName, username: 'fake-user', revoke: true })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('UserNotFound')
          expect(e.message, 'error message').to.be.equal('User not found.')
          expect(e.status, 'error status').to.be.equal(404)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Params must be object', async function () {
        try {
          await this.test.userbase.modifyDatabasePermissions()
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('ParamsMustBeObject')
          expect(e.message, 'error message').to.be.equal('Parameters passed to function must be placed inside an object.')
          expect(e.status, 'error status').to.be.equal(400)
        }
      })

      it('Params missing', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.modifyDatabasePermissions({ databaseName, username: 'abc' })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('ParamsMissing')
          expect(e.message, 'error message').to.be.equal('Parameters expected are missing.')
          expect(e.status, 'error status').to.be.equal(400)
        }
      })

      it('Database name missing', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.modifyDatabasePermissions({ username: 'fake-user', revoke: true })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('DatabaseNameMissing')
          expect(e.message, 'error message').to.be.equal('Database name missing.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Database name must be string', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.modifyDatabasePermissions({ databaseName: 1, username: 'fake-user', revoke: true })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('DatabaseNameMustBeString')
          expect(e.message, 'error message').to.be.equal('Database name must be a string.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Database name cannot be blank', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.modifyDatabasePermissions({ databaseName: '', username: 'fake-user', revoke: true })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('DatabaseNameCannotBeBlank')
          expect(e.message, 'error message').to.be.equal('Database name cannot be blank.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Database name too long', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.modifyDatabasePermissions({ databaseName: 'a'.repeat(51), username: 'fake-user', revoke: true })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.equal('DatabaseNameTooLong')
          expect(e.message, 'error message').to.equal('Database name cannot be more than 50 characters.')
          expect(e.status, 'error status').to.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Database name restricted', async function () {
        const verifiedUsersDatabaseName = '__userbase_verified_users'

        await signUp(this.test.userbase)

        try {
          await this.test.userbase.modifyDatabasePermissions({ databaseName: verifiedUsersDatabaseName, username: 'fake-user', revoke: true })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.equal('DatabaseNameRestricted')
          expect(e.message, 'error message').to.equal(`Database name '${verifiedUsersDatabaseName}' is restricted. It is used internally by userbase-js.`)
          expect(e.status, 'error status').to.equal(403)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Database id must be string', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.modifyDatabasePermissions({ databaseId: 1, username: 'fake-user', revoke: true })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.equal('DatabaseIdMustBeString')
          expect(e.message, 'error message').to.equal('Database id must be a string.')
          expect(e.status, 'error status').to.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Database id cannot be blank', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.modifyDatabasePermissions({ databaseId: '', username: 'fake-user', revoke: true })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('DatabaseIdCannotBeBlank')
          expect(e.message, 'error message').to.be.equal('Database id cannot be blank.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Database id not allowed', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.modifyDatabasePermissions({ databaseId: 'abc', databaseName, username: 'fake-user', revoke: true })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('DatabaseIdNotAllowed')
          expect(e.message, 'error message').to.be.equal('Database id not allowed. Cannot provide both databaseName and databaseId, can only provide one.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Database id invalid length', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.modifyDatabasePermissions({ databaseId: 'abc', username: 'fake-user', revoke: true })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('DatabaseIdInvalidLength')
          expect(e.message, 'error message').to.be.equal('Database id invalid length. Must be 36 characters.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Username missing', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.modifyDatabasePermissions({ databaseName, revoke: true })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('UsernameMissing')
          expect(e.message, 'error message').to.be.equal('Username missing.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Username cannot be blank', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.modifyDatabasePermissions({ databaseName, username: '', revoke: true })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('UsernameCannotBeBlank')
          expect(e.message, 'error message').to.be.equal('Username cannot be blank.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Username must be string', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.modifyDatabasePermissions({ databaseName, username: 1, revoke: true })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('UsernameMustBeString')
          expect(e.message, 'error message').to.be.equal('Username must be a string.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Read only must be boolean', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.modifyDatabasePermissions({ databaseName, username: 'fake-user', readOnly: 'not boolean' })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('ReadOnlyMustBeBoolean')
          expect(e.message, 'error message').to.be.equal('Read only value must be a boolean.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Read only param not allowed', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.modifyDatabasePermissions({ databaseName, username: 'fake-user', revoke: true, readOnly: true })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('ReadOnlyParamNotAllowed')
          expect(e.message, 'error message').to.be.equal('Read only parameter not allowed when revoking access to a database.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Resharing allowed must be boolean', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.modifyDatabasePermissions({ databaseName, username: 'fake-user', resharingAllowed: 'not boolean' })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('ResharingAllowedMustBeBoolean')
          expect(e.message, 'error message').to.be.equal('Resharing allowed value must be a boolean.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Resharing allowed param not allowed', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.modifyDatabasePermissions({ databaseName, username: 'fake-user', revoke: true, resharingAllowed: true })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('ResharingAllowedParamNotAllowed')
          expect(e.message, 'error message').to.be.equal('Resharing allowed parameter not allowed when revoking access to a database.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('Revoke must be boolean', async function () {
        await signUp(this.test.userbase)

        try {
          await this.test.userbase.modifyDatabasePermissions({ databaseName, username: 'fake-user', revoke: 'not boolean' })
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('RevokeMustBeBoolean')
          expect(e.message, 'error message').to.be.equal('Revoke value must be a boolean.')
          expect(e.status, 'error status').to.be.equal(400)
        }

        // clean up
        await this.test.userbase.deleteUser()
      })

      it('User not signed in', async function () {
        try {
          await this.test.userbase.getVerificationMessage()
          throw new Error('Should have failed')
        } catch (e) {
          expect(e.name, 'error name').to.be.equal('UserNotSignedIn')
          expect(e.message, 'error message').to.be.equal('Not signed in.')
          expect(e.status, 'error status').to.be.equal(400)
        }
      })

    })

  })

  //**
  //
  // Alice shares db with Bob, who shares with Charlie, who shares with Dan, who shares with Frank.
  // A -> B -> C -> D -> F
  //
  // Theses tests will check that the verification process works correctly from Charlie's perspective
  // verifying the other users in this order: D, B, F, A.
  //
  // */
  describe('Verification Process', function () {
    const getStartingDatabaseResult = function (test) {
      return {
        databaseName,
        databaseId: test.databaseId,
        receivedFromUsername: test.bob.username,
        isOwner: false,
        readOnly: true,
        resharingAllowed: true,
      }
    }

    const getStartingDatabaseUsersResult = function (test) {
      return [
        {
          username: test.alice.username,
          isOwner: true,
          readOnly: false,
          resharingAllowed: true,
        },
        {
          username: test.bob.username,
          receivedFromUsername: test.alice.username,
          isOwner: false,
          readOnly: true,
          resharingAllowed: true,
        },
        {
          username: test.dan.username,
          receivedFromUsername: test.charlie.username,
          isOwner: false,
          readOnly: true,
          resharingAllowed: true,
        },
        {
          username: test.frank.username,
          receivedFromUsername: test.dan.username,
          isOwner: false,
          readOnly: true,
          resharingAllowed: true,
        }
      ]
    }

    const getDatabaseAndUsers = async function (userbase) {
      const { databases } = await userbase.getDatabases()
      expect(databases, 'databases array').to.have.lengthOf(1)
      const database = databases[0]
      const databaseUsers = database.users
      delete database.users

      return { database, databaseUsers }
    }

    beforeEach(function () {
      cy.visit('./cypress/integration/index.html').then(async function (win) {
        expect(win).to.have.property('userbase')
        const userbase = win.userbase
        this.currentTest.userbase = userbase

        const { appId, endpoint } = Cypress.env()
        win._userbaseEndpoint = endpoint
        userbase.init({ appId })

        // Frank, Dan, Charlie, Bob, Alice sign up
        const frank = await signUp(userbase)
        this.currentTest.frank = { ...frank, ...await userbase.getVerificationMessage() }
        await userbase.signOut()

        const dan = await signUp(userbase)
        this.currentTest.dan = { ...dan, ...await userbase.getVerificationMessage() }
        await userbase.signOut()

        const charlie = await signUp(userbase)
        this.currentTest.charlie = { ...charlie, ...await userbase.getVerificationMessage() }
        await userbase.signOut()

        const bob = await signUp(userbase)
        this.currentTest.bob = { ...bob, ...await userbase.getVerificationMessage() }
        await userbase.signOut()

        const alice = await signUp(userbase)
        this.currentTest.alice = { ...alice, ...await userbase.getVerificationMessage() }

        // Alice creates database and shares with Bob
        await userbase.openDatabase({ databaseName, changeHandler: () => { } })
        await userbase.shareDatabase({ databaseName, username: bob.username, requireVerified: false, resharingAllowed: true })
        await userbase.signOut()

        // Bob signs in, gets databaseId, and shares with Charlie
        await userbase.signIn({ username: bob.username, password: bob.password, rememberMe: 'none' })
        const { databases } = await userbase.getDatabases()
        const { databaseId } = databases[0]
        this.currentTest.databaseId = databaseId
        await userbase.shareDatabase({ databaseId, username: charlie.username, requireVerified: false, resharingAllowed: true })
        await userbase.signOut()

        // Charlie shares with Dan
        await userbase.signIn({ username: charlie.username, password: charlie.password, rememberMe: 'none' })
        await userbase.getDatabases()
        await userbase.shareDatabase({ databaseId, username: dan.username, requireVerified: false, resharingAllowed: true })
        await userbase.signOut()

        // Dan shares with Frank
        await userbase.signIn({ username: dan.username, password: dan.password, rememberMe: 'none' })
        await userbase.getDatabases()
        await userbase.shareDatabase({ databaseId, username: frank.username, requireVerified: false, resharingAllowed: true })
        await userbase.signOut()

        // Frank accepts database
        await userbase.signIn({ username: frank.username, password: frank.password, rememberMe: 'none' })
        await userbase.getDatabases()
        await userbase.signOut()

        // Charlie signs in
        await userbase.signIn({ username: charlie.username, password: charlie.password, rememberMe: 'none' })
      })
    })

    afterEach(async function () {
      const { userbase, alice, bob, dan, frank } = this.currentTest

      // delete Charlie, Alice, Bob, Dan, and Frank
      await userbase.deleteUser()

      await userbase.signIn({ username: alice.username, password: alice.password, rememberMe: 'none' })
      await userbase.deleteUser()

      await userbase.signIn({ username: bob.username, password: bob.password, rememberMe: 'none' })
      await userbase.deleteUser()

      await userbase.signIn({ username: dan.username, password: dan.password, rememberMe: 'none' })
      await userbase.deleteUser()

      await userbase.signIn({ username: frank.username, password: frank.password, rememberMe: 'none' })
      await userbase.deleteUser()
    })

    it('Charlie initial getDatabases()', async function () {
      const { database, databaseUsers } = await getDatabaseAndUsers(this.test.userbase)

      const expectedDatabase = getStartingDatabaseResult(this.test)
      const expectedDatabaseUsers = getStartingDatabaseUsersResult(this.test)

      expect(database, 'starting database').to.deep.equal(expectedDatabase)
      expect(databaseUsers, 'starting database').to.deep.have.same.members(expectedDatabaseUsers)
    })

    it('Charlie verifies Dan', async function () {
      // Charlie verifies Dan
      await this.test.userbase.verifyUser({ verificationMessage: this.test.dan.verificationMessage })

      const { database, databaseUsers } = await getDatabaseAndUsers(this.test.userbase)

      const expectedDatabase = getStartingDatabaseResult(this.test)
      const expectedDatabaseUsers = getStartingDatabaseUsersResult(this.test)

      // Charlie makes sure Dan and only Dan is verified
      const danIndex = 2
      expectedDatabaseUsers[danIndex].verified = true

      expect(database, 'starting database').to.deep.equal(expectedDatabase)
      expect(databaseUsers, 'starting database').to.deep.have.same.members(expectedDatabaseUsers)
    })

    it('Charlie verifies Bob', async function () {
      // Charlie verifies Dan and Bob
      await Promise.all([
        this.test.userbase.verifyUser({ verificationMessage: this.test.dan.verificationMessage }),
        this.test.userbase.verifyUser({ verificationMessage: this.test.bob.verificationMessage }),
      ])

      const { database, databaseUsers } = await getDatabaseAndUsers(this.test.userbase)

      const expectedDatabase = getStartingDatabaseResult(this.test)
      const expectedDatabaseUsers = getStartingDatabaseUsersResult(this.test)

      // Charlie makes sure Dan and Bob are verified
      const danIndex = 2
      expectedDatabaseUsers[danIndex].verified = true

      const bobIndex = 1
      expectedDatabaseUsers[bobIndex].verified = true

      expect(database, 'starting database').to.deep.equal(expectedDatabase)
      expect(databaseUsers, 'starting database').to.deep.have.same.members(expectedDatabaseUsers)
    })

    it('Charlie verifies Frank', async function () {
      // Charlie verifies Dan, Bob, and Frank
      await Promise.all([
        this.test.userbase.verifyUser({ verificationMessage: this.test.dan.verificationMessage }),
        this.test.userbase.verifyUser({ verificationMessage: this.test.bob.verificationMessage }),
        this.test.userbase.verifyUser({ verificationMessage: this.test.frank.verificationMessage }),
      ])

      const { database, databaseUsers } = await getDatabaseAndUsers(this.test.userbase)

      const expectedDatabase = getStartingDatabaseResult(this.test)
      const expectedDatabaseUsers = getStartingDatabaseUsersResult(this.test)

      // Charlie makes sure Dan, Bob, and Frank are verified
      const danIndex = 2
      expectedDatabaseUsers[danIndex].verified = true

      const bobIndex = 1
      expectedDatabaseUsers[bobIndex].verified = true

      const frankIndex = 3
      expectedDatabaseUsers[frankIndex].verified = true

      expect(database, 'starting database').to.deep.equal(expectedDatabase)
      expect(databaseUsers, 'starting database').to.deep.have.same.members(expectedDatabaseUsers)
    })

    it('Charlie verifies Alice', async function () {
      // Charlie verifies Dan, Bob, Frank, and Alice
      await Promise.all([
        this.test.userbase.verifyUser({ verificationMessage: this.test.dan.verificationMessage }),
        this.test.userbase.verifyUser({ verificationMessage: this.test.bob.verificationMessage }),
        this.test.userbase.verifyUser({ verificationMessage: this.test.frank.verificationMessage }),
        this.test.userbase.verifyUser({ verificationMessage: this.test.alice.verificationMessage }),
      ])

      const { database, databaseUsers } = await getDatabaseAndUsers(this.test.userbase)

      const expectedDatabase = getStartingDatabaseResult(this.test)
      const expectedDatabaseUsers = getStartingDatabaseUsersResult(this.test)

      // Charlie makes sure Dan, Bob, Frank, and Alice are verified
      const danIndex = 2
      expectedDatabaseUsers[danIndex].verified = true

      const bobIndex = 1
      expectedDatabaseUsers[bobIndex].verified = true

      const frankIndex = 3
      expectedDatabaseUsers[frankIndex].verified = true

      const aliceIndex = 0
      expectedDatabaseUsers[aliceIndex].verified = true

      expect(database, 'starting database').to.deep.equal(expectedDatabase)
      expect(databaseUsers, 'starting database').to.deep.have.same.members(expectedDatabaseUsers)
    })

  })
})
