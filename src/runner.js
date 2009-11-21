JsUnitTest.Unit.Runner = function(testcases) { 
	
	this.options = arguments[1] || {};
    this.options.testLog = ( this.options.testLog ) ? this.options.testLog: 'testLog';
    this.options.resultsURL = ( this.options.resultsURL ) ? this.options.resultsURL: this.queryParams.resultsURL;
    this.options.resultsPost = ('resultsPost' in this.options) ? this.options.resultsPost: false;
	this.options.runAsync = ('runAsync' in this.options) ? this.options.runAsync: true;

    this.tests = this.getTests(testcases);
    this.currentTest = 0;                                     
	this.logger = new JsUnitTest.Unit.Logger(this.options.testLog);
	this.options.testLog = JsUnitTest.$(this.options.testLog);

	if ( this.options.runAsync ){
	  var self = this;
	  JsUnitTest.Event.addEvent(window, "load", function() {
	    setTimeout(function() {
	      self.runTests();
	    }, 0.1);
	  });

	} else {

		JsUnitTest.Unit.Runner.testList.runnerList.push( this );  
		
		if ( JsUnitTest.Unit.Runner.testList.runnerList.length == 1 ){
			JsUnitTest.Event.addEvent(window, "load", function() { 
				
	      		JsUnitTest.Unit.Runner.testList.runnerList[JsUnitTest.Unit.Runner.testList.currentRunner].runTests();
		  	
			});
		}

	}
	
};  

JsUnitTest.Unit.Runner.testList = {
	currentRunner: 0,
	runnerList: []
};

JsUnitTest.Unit.Runner.prototype.queryParams = JsUnitTest.toQueryParams();

JsUnitTest.Unit.Runner.prototype.portNumber = function() {
  if (window.location.search.length > 0) {
    var matches = window.location.search.match(/\:(\d{3,5})\//);
    if (matches) {
      return parseInt(matches[1], 10);
    }
  }
  return null;
};

JsUnitTest.Unit.Runner.prototype.getTests = function(testcases) {
  var tests = [], options = this.options;
  if (this.queryParams.tests) {tests = this.queryParams.tests.split(',');}
  else if (options.tests) {tests = options.tests;}
  else if (options.test) {tests = [option.test];}
  else {
    for (testname in testcases) {
      if (testname.match(/^test/)) {tests.push(testname);}
    }
  }
  var results = [];
  for (var i=0; i < tests.length; i++) {
    var test = tests[i];
    if (testcases[test]) {
      results.push(
        new JsUnitTest.Unit.Testcase(test, testcases[test], testcases.setup, testcases.teardown)
      );
    }
  }
  return results;
};

JsUnitTest.Unit.Runner.prototype.getResult = function() {
  var results = {
    tests: this.tests.length,
    assertions: 0,
    failures: 0,
    errors: 0,
    warnings: 0
  };
  
  for (var i=0; i < this.tests.length; i++) {
    var test = this.tests[i];
    results.assertions += test.assertions;
    results.failures   += test.failures;
    results.errors     += test.errors;
    results.warnings   += test.warnings;
  }
  return results;
};

JsUnitTest.Unit.Runner.prototype.getResult = function() {
  var results = {
    tests: this.tests.length,
    assertions: 0,
    failures: 0,
    errors: 0,
    warnings: 0
  };

  for (var i=0; i < this.tests.length; i++) {
    var test = this.tests[i];
    results.assertions += test.assertions;
    results.failures   += test.failures;
    results.errors     += test.errors;
    results.warnings   += test.warnings;
  };
  return results;
};

JsUnitTest.Unit.Runner.prototype.postResults = function() {
	
  if (this.options.resultsURL) {
  
    var results = this.getResult();
    
    var data = ["tests="+ this.tests.length];
    var getData = ['assertions','warnings','failures','errors'];
    for (var i in getData){
			data.push(encodeURIComponent(getData[i]) +'='+ encodeURIComponent(results[getData[i]]));
    }
    
    var url = this.options.resultsURL;
    
    if (this.options.resultsPost == true){
    	var type = 'POST';
    	var getData = ['name','assertions','errors','failures','warnings','messages']
    	for (var x in this.tests){
    		for (var i in getData){
  				data.push('results[]'+getData[i]+'='+encodeURIComponent(this.tests[x][getData[i]]));
  			}
    	}
    	data = data.join('&').replace(/%20/g, "+");
    } else {
    	var type = 'GET';
    	url = url +'?'+ data.join('&').replace(/%20/g, "+");
    	data = null;
    }
    JsUnitTest.ajax({
      url: url,
      type: type,
      data: data
    })
  }
};

JsUnitTest.Unit.Runner.prototype.runTests = function() {
  var test = this.tests[this.currentTest], actions;
  
  if (!test) {return this.finish();}
  if (!test.isWaiting) {this.logger.start(test.name);}
  test.run();
  var self = this;
  if(test.isWaiting) {
    this.logger.message("Waiting for " + test.timeToWait + "ms");
    // setTimeout(this.runTests.bind(this), test.timeToWait || 1000);
    setTimeout(function() {
      self.runTests();
    }, test.timeToWait || 1000);
    return;
  }
  
  this.logger.finish(test.status(), test.summary());
  if (actions = test.actions) {this.logger.appendActionButtons(actions);}
  this.currentTest++;
  // tail recursive, hopefully the browser will skip the stackframe
  this.runTests();
};

JsUnitTest.Unit.Runner.prototype.finish = function() {
  this.postResults();
  this.logger.summary(this.summary());  

  if ( !this.options.runAsync ){ 
  	JsUnitTest.Unit.Runner.testList.currentRunner++;   

	    if (JsUnitTest.Unit.Runner.testList.currentRunner < JsUnitTest.Unit.Runner.testList.runnerList.length) {
	        JsUnitTest.Unit.Runner.testList.runnerList[JsUnitTest.Unit.Runner.testList.currentRunner].runTests(); 
	    }   
	}
};

JsUnitTest.Unit.Runner.prototype.summary = function() {
  return new JsUnitTest.Template('#{tests} tests, #{assertions} assertions, #{failures} failures, #{errors} errors, #{warnings} warnings').evaluate(this.getResult());
};
