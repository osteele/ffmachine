module.exports = (grunt) ->
  grunt.initConfig
    pkg: grunt.file.readJSON 'package.json'
    coffee:
      debug:
        expand: true
        cwd: 'public'
        src: ['**/*.coffee', '!**/node_modules/**', '!Gruntfile.coffee']
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
      app: ['**/*.coffee', '!**/node_modules/**', '!Gruntfile.coffee']
      gruntfile: ['Gruntfile.coffee']
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
        cwd: 'public'
        dest: 'build'
        src: ['**', '!**/*.coffee', '!**/*.jade', '!**/*.scss']
        filter: 'isFile'
      release:
        expand: true
        cwd: 'public'
        dest: 'release'
        src: ['**', '!**/*.coffee', '!**/*.jade', '!**/*.scss']
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
        dest: 'release'
        ext: '.html'
    sass:
      debug:
        files:
          'build/home.css': 'public/home.scss'
        options:
          sourcemap: true
      release:
        files:
          'release/home.css': 'public/home.scss'
        options:
          sourcemap: false
          style: 'compressed'
    watch:
      options:
        livereload: true
      coffeelint:
        files: ['**/*.coffee', '!**/node_modules/**', '!Gruntfile.coffee']
        tasks: ['coffeelint:app']
        options:
          livereload: false
      copy:
        files: ['public/**/*.css', 'public/**/*.html', 'public/**/*.js', 'public/**/*.png']
        tasks: ['copy:debug']
      gruntfile:
        files: 'Gruntfile.coffee'
        tasks: ['coffeelint:gruntfile']
      jade:
        files: ['public/**/*.jade']
        tasks: ['jade:debug']
      sass:
        files: ['public/**/*.scss']
        tasks: ['sass:debug']
      scripts:
        files: ['**/*.coffee', '!**/node_modules/**', '!Gruntfile.coffee']
        tasks: ['coffeelint:app', 'coffee:debug']

  grunt.loadNpmTasks 'grunt-coffeelint'
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-connect'
  grunt.loadNpmTasks 'grunt-contrib-copy'
  grunt.loadNpmTasks 'grunt-contrib-jade'
  grunt.loadNpmTasks 'grunt-contrib-sass'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-github-pages'
  grunt.loadNpmTasks 'grunt-notify'

  grunt.registerTask 'build', ['coffeelint', 'coffee:debug', 'copy:debug', 'jade:debug', 'sass:debug']
  grunt.registerTask 'build:release', ['coffeelint', 'coffee:release', 'copy:release', 'jade:release', 'sass:release']
  grunt.registerTask 'deploy', ['build:release', 'githubPages:target']
  grunt.registerTask 'default', ['build', 'connect', 'watch']
