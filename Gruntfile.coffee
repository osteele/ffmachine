module.exports = (grunt) ->
  grunt.initConfig
    pkg: grunt.file.readJSON 'package.json'
    coffee:
      debug:
        expand: true
        cwd: 'public'
        src: '**/*.coffee'
        dest: 'build'
        ext: '.js'
        options:
          sourceMap: true
      release:
        expand: true
        cwd: 'public'
        src: '**/*.coffee'
        dest: 'release'
        ext: '.js'
        options:
          sourceMap: false
    coffeelint:
      app: ['**/*.coffee', '!**/node_modules/**']
      options:
        max_line_length:
          value: 120
    connect:
      server:
        options:
          base: 'build'
    githubPages:
      target:
        src: 'release'
    copy:
      debug:
        expand: true
        cwd: 'public/'
        dest: 'build/'
        src: ['**', '!**/*.coffee', '!**/*.jade']
        filter: 'isFile'
      release:
        expand: true
        cwd: 'public/'
        dest: 'release/'
        src: ['**', '!**/*.coffee', '!**/*.jade']
        filter: 'isFile'
    jade:
      debug:
        expand: true
        cwd: 'public'
        src: '**/*.jade'
        dest: 'build'
        ext: '.html'
        options:
          pretty: true
      release:
        expand: true
        cwd: 'public'
        src: '**/*.jade'
        dest: 'build'
        ext: '.html'
    watch:
      options:
        livereload: true
      copy:
        files: ['public/**/*.js', 'public/**/*.html', 'public/**/*.css']
        tasks: ['copy:debug']
      gruntfile:
        files: 'Gruntfile.coffee'
        tasks: ['coffeelint']
      jade:
        files: ['public/**/*.jade']
        tasks: ['jade:debug']
      scripts:
        files: ['**/*.coffee', '!**/node_modules/**']
        tasks: ['coffeelint', 'coffee:debug']

  grunt.loadNpmTasks 'grunt-coffeelint'
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-connect'
  grunt.loadNpmTasks 'grunt-contrib-copy'
  grunt.loadNpmTasks 'grunt-contrib-jade'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-notify'

  grunt.registerTask 'build', ['coffee:debug', 'copy:debug', 'jade:debug']
  grunt.registerTask 'build:release', ['coffee:release', 'copy:release', 'jade:release']
  grunt.registerTask 'deploy', ['build:release', 'githubPages:target']
  grunt.registerTask 'default', ['build', 'connect', 'watch']
