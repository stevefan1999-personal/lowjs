'use strict';

let native = require('native');
let stream = require('stream');

module.exports = {
    open: native.open,
    openSync: native.openSync,

    closeSync: native.closeSync,
    close: native.close,

    unlink: native.unlink,
    unlinkSync: native.unlinkSync,

    rename: native.rename,
    renameSync: native.renameSync,

    rename: native.rename,
    renameSync: native.renameSync,

    access: native.access,
    accessSync: native.accessSync,

    readdir: native.readdir,
    readdirSync: native.readdirSync,

    mkdir: native.mkdir,
    mkdirSync: native.mkdirSync,

    rmdir: native.rmdir,
    rmdirSync: native.rmdirSync
};
exports = module.exports;

exports.read = (fd, buffer, offset, length, position, callback) => {
    let cb;
    function res(err, bytesRead) {
        cb(err, bytesRead, buffer);
    }

    if (callback === undefined) {
        if (position === undefined) {
            if (length === undefined) {
                cb = offset;
                native.read(fd, buffer, 0, buffer.length, null, res);
            } else {
                cb = length;
                native.read(fd, buffer, offset, buffer.length - offset, null, res);
            }
        } else {
            cb = position;
            native.read(fd, buffer, offset, length, null, res);
        }
    } else {
        cb = callback;
        native.read(fd, buffer, offset, length, position, res);
    }
};

exports.write = (fd, buffer, offset, length, position, callback) => {
    let cb;
    function res(err, bytesWritten) {
        cb(err, bytesWritten, buffer);
    }

    if (callback === undefined) {
        if (position === undefined) {
            if (length === undefined) {
                cb = offset;
                native.write(fd, buffer, 0, buffer.length, null, res);
            } else {
                cb = length;
                native.write(fd, buffer, offset, buffer.length - offset, null, res);
            }
        } else {
            cb = position;
            native.write(fd, buffer, offset, length, null, res);
        }
    } else {
        cb = callback;
        native.write(fd, buffer, offset, length, position, res);
    }
};

class Stats {
    // sorry but octal literals are no-no in strict mode
    // also these are copied from sys/stat.h so not sure about portability
    static S_IFMT = parseInt('0170000', 8)
    static S_IFDIR = parseInt('0040000', 8)
    static S_IFCHR = parseInt('0020000', 8)
    static S_IFBLK = parseInt('0060000', 8)
    static S_IFREG = parseInt('0100000', 8)
    static S_IFIFO = parseInt('0010000', 8)
    static S_IFLNK = parseInt('0120000', 8)
    static S_IFSOCK = parseInt('0140000', 8)
    //$

    constructor(stat) { Object.assign(this, stat) }
    get fileType() { return this.mode & Stats.S_IFMT }
    get atime() { return new Date(this.atimeMs) }
    get mtime() { return new Date(this.mtimeMs) }
    get ctime() { return new Date(this.ctimeMs) }

    isFile = () => this.fileType == Stats.S_IFREG
    isDirectory = () => this.fileType == Stats.S_IFDIR
    isBlockDevice = () => this.fileType == Stats.S_IFBLK
    isCharacterDevice = () => this.fileType == Stats.S_IFCHR
    isSymbolicLink = () => this.fileType == Stats.S_IFLNK
    isFIFO = () => this.fileType == Stats.S_IFIFO
    isSocket = () => this.fileType == Stats.S_IFSOCK
    //$
}

exports.Stats = Stats;

exports.fstat = (fd, cb) => native.fstat(fd, (err, stat) => cb(err, new Stats(stat)));
exports.stat = (path, cb) => native.stat(path, (err, stat) => cb(err, new Stats(stat)));
exports.statSync = (path, cb) => new Stats(native.statSync(path));

exports.readSync = (fd, buffer, offset, length, position) => {
    let resErr;
    let resBytesRead;
    function res(err, bytesRead) {
        resErr = err;
        resBytesRead = bytesRead;
    }

    if (position === undefined) {
        if (length === undefined) {
            if (offset == undefined)
                native.read(fd, buffer, 0, buffer.length, null, res);
            else
                native.read(fd, buffer, offset, buffer.length - offset, null, res);
        } else
            native.read(fd, buffer, offset, length, null, res);
    } else
        native.read(fd, buffer, offset, length, position, res);
    native.waitDone(fd);

    if (resErr)
        throw new Error(resErr);
    return resBytesRead;
};

exports.writeSync = (fd, buffer, offset, length, position) => {
    let resErr;
    let resBytesWritten;
    function res(err, bytesWritten) {
        resErr = err;
        resBytesWritten = bytesWritten;
    }

    if (position === undefined) {
        if (length === undefined) {
            if (offset == undefined)
                native.write(fd, buffer, 0, buffer.length, null, res);
            else
                native.write(fd, buffer, offset, buffer.length - offset, null, res);
        } else
            native.write(fd, buffer, offset, length, null, res);
    } else
        native.write(fd, buffer, offset, length, position, res);
    native.waitDone(fd);

    if (resErr)
        throw new Error(resErr);
    return resBytesWritten;
};

exports.fstatSync = (fd) => {
    let resErr;
    let resStat;
    exports.fstat(fd, (err, stat) => {
        resErr = err;
        resStat = stat;
    });
    native.waitDone(fd);
    if (resErr)
        throw new Error(resErr);
    return resStat;
};

exports.readFile = (path, options, callback) => {
    if (!callback) {
        callback = options;
        options = null;
    } else if (typeof options === 'string')
        options = { 'encoding': options };

    exports.open(path, options && options.flags ? options.flags : 'r', (err, fd) => {
        if (err) {
            callback(err);
            return;
        }

        let stat = exports.fstat(fd, (err, stat) => {
            if (err) {
                exports.close(fd, () => {
                    callback(err);
                });
                return;
            }

            let buf = new Buffer(stat.size);
            exports.read(fd, buf, 0, stat.size, null, (err) => {
                if (err) {
                    exports.close(fd, () => {
                        callback(err);
                    });
                    return;
                }

                exports.close(fd, (err) => {
                    if (err) {
                        callback(err);
                        return;
                    }

                    if (options && options.encoding)
                        callback(null, buf.toString(options.encoding));
                    else
                        callback(null, buf);
                });
            });
        });
    });
};

exports.readFileSync = (path, options) => {
    if (typeof options === 'string')
        options = { 'encoding': options };

    let fd = exports.openSync(path, options && options.flags ? options.flags : 'r');
    try {
        let stat = exports.fstatSync(fd);
        let buf = new Buffer(stat.size);
        exports.readSync(fd, buf, 0, stat.size, null);
    } catch (e) {
        exports.closeSync(fd);
        throw e;
    }
    exports.closeSync(fd);

    if (options && options.encoding)
        return buf.toString(options.encoding);
    else
        return buf;
};

exports.writeFile = (path, data, options, callback) => {
    if (!callback) {
        callback = options;
        options = null;
    } else if (typeof options === 'string')
        options = { 'encoding': options };
    if (typeof data === 'string')
        data = new Buffer(data, options && options.encoding ? options.encoding : 'utf8');

    exports.open(path, options && options.flags ? options.flags : 'w', (err, fd) => {
        if (err) {
            callback(err);
            return;
        }

        exports.write(fd, data, 0, data.length, null, (err) => {
            if (err) {
                exports.close(fd, () => {
                    callback(err);
                });
                return;
            }

            exports.close(fd, (err) => {
                if (err) {
                    callback(err);
                    return;
                }

                callback(null);
            });
        });
    });
};

exports.writeFileSync = (path, data, options) => {
    if (typeof options === 'string')
        options = { 'encoding': options };
    if (typeof data === 'string')
        data = new Buffer(data, options && options.encoding ? options.encoding : 'utf8');

    let fd = exports.openSync(path, options && options.flags ? options.flags : 'w');
    try {
        exports.writeSync(fd, data, 0, data.length, null);
    } catch (e) {
    }
    exports.close(fd);
};

exports.appendFile = (path, data, options, callback) => {
    if (typeof options === 'string')
        options = { 'encoding': options, 'flag': 'a' };
    else if(!callback) {
        callback = options;
        options = { 'flag': 'a' };
    } else if(!options.flag)
        options.flag = 'a';

    exports.writeFile(path, data, options, callback);
}
exports.appendFileSync = (path, data, options) => {
    if (typeof options === 'string')
        options = { 'encoding': options, 'flag': 'a' };
    else if(!options)
        options = { 'flag': 'a' };
    else if(!options.flag)
        options.flag = 'a';

    return exports.writeFileSync(path, data, options);
}

class ReadStream extends stream.Readable {
    constructor(path, options) {
        if (typeof options === 'string')
            options = { encoding: options };

        this.path = path;
        this.bytesRead = 0;
        this._autoClose = options && options.autoClose !== undefined ? options.autoClose : true;
        if (this._autoClose)
            this.on('error', () => { this.destroy(); });

        if (options && options.start !== undefined)
            this._pos = options.start;
        if (options && options.end !== undefined)
            this._end = options.end + 1;

        super({
            highWaterMark: options && options.highWaterMark !== undefined ? options.highWaterMark : 64 * 1024,
            encoding: options ? options.encoding : null,
            read(size) {
                if (this._fd === undefined) {
                    this._readSize = size;
                    return;
                }
                delete this._readSize;

                if (this._end !== undefined && size > this._end - this._pos)
                    size = this._end - this._pos;
                if (size <= 0) {
                    this.push(null);
                    return;
                }

                let buf = new Buffer(size);
                native.read(this._fd, buf, 0, size, this._posSet ? null : this._pos, (err, bytesRead) => {
                    if (err) {
                        this.destroy(err);
                        return;
                    }

                    this._posSet = true;
                    if (bytesRead == 0) {
                        this.push(null);
                        if (this._autoClose)
                            this.close();
                    } else {
                        this._pos += bytesRead;
                        this.bytesRead += bytesRead;

                        this.push(bytesRead != buf.length ? buf.slice(0, bytesRead) : buf);
                    }
                });
            },
            destroy(err, callback) {
                if (this._autoClose)
                    this.close(callback);
                else
                    callback();
            }
        });

        if (!options || options.fd === undefined || options.fd === null) {
            native.open(path,
                options && options.flags ? options.flags : 'r',
                options && options.mode ? options.mode : 0o66, (err, fd) => {
                    if (err) {
                        this.emit('error', err);
                        return;
                    }

                    this._fd = fd;
                    if (this._pos === undefined) {
                        if (this._end !== undefined)
                            this._pos = native.file_pos(this._fd);
                        this._posSet = true;
                    }

                    this.emit('open', fd);
                    this.emit('ready');

                    if (this._readSize !== undefined)
                        this._read(this._readSize);
                    if (this._closed) {
                        this._closed = false;
                        this.close();
                    }
                });
        } else {
            this._fd = options.fd;
            if (this._pos === undefined) {
                if (this._end !== undefined)
                    this._pos = native.file_pos(this._fd);
                this._posSet = true;
            }
            this.emit('ready');

            if (this._readSize !== undefined)
                this._read(this._readSize);
        }
    }

    close(callback) {
        if (callback)
            this.once('close', callback);

        this._closed = true;
        if (!this._fd)
            return;

        native.close(this._fd, (err) => {
            if (err) {
                this.emit('error', err);
                return;
            }
            this.emit('close');
        });
        delete this._fd;
    }
}

exports.ReadStream = ReadStream;
exports.createReadStream = (path, options) => new ReadStream(path, options)

class WriteStream extends stream.Writable {
    constructor(path, options) {
        if (typeof options === 'string')
            options = { encoding: options };

        this.path = path;
        this.bytesWritten = 0;
        this._autoClose = options && options.autoClose !== undefined ? options.autoClose : true;
        if (this._autoClose)
            this.on('error', () => { this.destroy(); });

        if (options && options.start !== undefined)
            this._pos = options.start;

        super({
            encoding: options ? options.encoding : 'utf8',
            write(chunk, encoding, callback) {
                if (this._fd === undefined) {
                    this._writeData = [chunk, encoding, callback];
                    return;
                }
                delete this._writeData;

                native.write(this._fd, chunk, 0, chunk.length, this._posSet ? null : this._pos, (err, bytesWritten) => {
                    if (err) {
                        this.destroy(err);
                        return;
                    }

                    this._pos += bytesWritten;
                    this._posSet = true;
                    this.bytesWritten += bytesWritten;

                    if (chunk.length != bytesWritten) {
                        this._write(chunk.slice(bytesWritten), encoding, callback);
                        return;
                    }
                    callback();
                });
            },
            final(callback) {
                this._destroy(null, callback);
            },
            destroy(err, callback) {
                if (this._autoClose)
                    this.close(callback);
                else
                    callback();
            }
        });

        if (!options || options.fd === undefined || options.fd === null) {
            native.open(path,
                options && options.flags ? options.flags : 'w',
                options && options.mode ? options.mode : 0o66, (err, fd, pos) => {
                    if (err) {
                        this.emit('error', err);
                        return;
                    }

                    this._fd = fd;
                    if (this._pos === undefined) {
                        if (this._end !== undefined)
                            this._pos = native.file_pos(this._fd);
                        this._posSet = true;
                    }

                    this.emit('open', fd);
                    this.emit('ready');

                    if (this._writeData !== undefined)
                        this._write(this._writeData[0], this._writeData[1], this._writeData[2]);
                    if (this._closed) {
                        this._closed = false;
                        this.close();
                    }
                });
        } else {
            this._fd = options.fd;
            if (this._pos === undefined) {
                if (this._end !== undefined)
                    this._pos = native.file_pos(this._fd);
                this._posSet = true;
            }
            this.emit('ready');

            if (this._writeData !== undefined)
                this._write(this._writeData[0], this._writeData[1], this._writeData[2]);
        }
    }

    close(callback) {
        if (callback)
            this.once('close', callback);

        this._closed = true;
        if (!this._fd)
            return;

        native.close(this._fd, (err) => {
            if (err) {
                this.emit('error', err);
                return;
            }
            this.emit('close');
        });
        delete this._fd;
    }
}

exports.WriteStream = WriteStream;
exports.createWriteStream = (path, options) => new WriteStream(path, options)

exports.constants = {
    S_IFIFO: 4096,
    S_IFCHR: 8192,
    S_IFDIR: 16384,
    S_IFBLK: 24576,
    S_IFREG: 32768,
    S_IFLNK: 40960,
    S_IFSOCK: 49152,
    S_IFMT: 61440,
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
    COPYFILE_EXCL: 0,
    COPYFILE_FICLONE: 0,
    COPYFILE_FICLONE_FORCE: 0,
    O_RDONLY: 0x0000,
    O_WRONLY: 0x0001,
    O_RDWR: 0x0002,
    O_CREAT: 0x0200,
    O_EXCL: 0x0800,
    O_NOCTTY: 0x20000,
    O_TRUNC: 0x0400,
    O_APPEND: 0x0008,
    O_DIRECTORY: 0x100000,
    O_NOATIME: 0,           // not defined under Mac OS X
    O_NOFOLLOW: 0x0100,
    O_SYNC: 0x0080,
    O_DSYNC: 0x400000,
    O_SYMLINK: 0x200000,
    O_DIRECT: 0x100000,
    O_NONBLOCK: 0x4000
};
