module.exports = (grunt) ->
  grunt.initConfig
    pkg: grunt.file.readJSON 'package.json'
    coffee:
      debug:
        expand: true
        cwd: 'public'
        src: '*.coffee'
        dest: 'build'
        ext: '.js'
        options:
          sourceMap: true
      release:
        expand: true
        cwd: 'public'
        src: '*.coffee'
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
          base: 'public'
    githubPages:
      target:
        src: 'release'
    copy:
      release:
        expand: true
        cwd: 'client/'
        dest: 'release/'
        src: '**'
        filter: 'isFile'
    watch:
      options:
        livereload: true
      gruntfile:
        files: 'Gruntfile.coffee'
        tasks: ['coffeelint']
      scripts:
        files: ['**/*.coffee', '!**/node_modules/**']
        tasks: ['coffeelint', 'coffee:debug']
      static: # watch these for livereload
        files: ['client/**/*']

  grunt.loadNpmTasks 'grunt-coffeelint'
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-connect'
  grunt.loadNpmTasks 'grunt-contrib-copy'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-notify'

  grunt.registerTask 'build', ['coffee:debug']
  grunt.registerTask 'build:release', ['coffee:release', 'copy:release']
  grunt.registerTask 'deploy', ['build:release', 'githubPages:target']
  grunt.registerTask 'default', ['build', 'connect', 'watch']
