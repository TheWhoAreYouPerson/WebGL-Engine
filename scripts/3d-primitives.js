
/** Stores data relating to the position, rotation and scale of an actor in a stage */
class Transform
{
	/**
	 * Stores data relating to the position, rotation and scale of an actor in a stage
	 * @param {vec3} translation (default: no translation)
	 * @param {quat} rotation (default: no rotation)
	 * @param {vec3} scale (default: 1x scale)
	 */
	constructor(translation = vec3.create(), rotation = quat.create(), scale = vec3.fromValues(1, 1, 1))
	{
		this.translation = translation;
		this.rotation = rotation;
		this.scale = scale;
		this._modelMatrix = mat4.create();
	}

	/** @type {number[]} */
	get modelMatrix()
	{
		return this._modelMatrix;
	}
	set modelMatrix(value)
	{
		this._modelMatrix = value;
	}

	initModelMatrix()
	{
		mat4.fromRotationTranslationScale(this._modelMatrix, this.rotation, this.translation, this.scale);
		return this.modelMatrix;
	}


	/** @type {number} */ get posX() { return this.translation[0]; }
	/** @type {number} */ get posY() { return this.translation[1]; }
	/** @type {number} */ get posZ() { return this.translation[2]; }

	/** @type {number} */ set posX(value) { this.translation[0] = value; }
	/** @type {number} */ set posY(value) { this.translation[1] = value; }
	/** @type {number} */ set posZ(value) { this.translation[2] = value; }

	/** @type {number} */ set rotationX(value) { quat.rotateX(this.rotation, quat.create(), value); }
	/** @type {number} */ set rotationY(value) { quat.rotateY(this.rotation, quat.create(), value); }
	/** @type {number} */ set rotationZ(value) { quat.rotateZ(this.rotation, quat.create(), value); }

	/** @type {number} */ get scaleX() { return this.scale[0]; }
	/** @type {number} */ get scaleY() { return this.scale[1]; }
	/** @type {number} */ get scaleZ() { return this.scale[2]; }

	/** @type {number} */ set scaleX(value) { this.scale[0] = value; }
	/** @type {number} */ set scaleY(value) { this.scale[1] = value; }
	/** @type {number} */ set scaleZ(value) { this.scale[2] = value; }

	/* Unneeded? (Just use the regular getters/setters at the call site.)
	let t = new Translation();
	t.posX += myValue;

	this.translateX = (value) => { this.translation[0] += value; };
	this.translateY = (value) => { this.translation[1] += value; };
	this.translateZ = (value) => { this.translation[2] += value; }; */

	rotateX(value) { quat.rotateX(this.rotation, this.rotation, value); }
	rotateY(value) { quat.rotateY(this.rotation, this.rotation, value); }
	rotateZ(value) { quat.rotateZ(this.rotation, this.rotation, value); }
}

/** An entity that exists in worldspace */
class StageActor
{
	/**
	 * @param {string} name
	 * @param {string} modelName
	 */
	constructor(name = '', modelName = DEFAULT_MODEL_NAME)
	{
		this.name = name;
		this.modelName = modelName;
		this.transform = new Transform();
	}

	update(deltaTime, elapsedTime)
	{
		// TODO eval() from externally loaded script
		// note: *never* use 'eval'
		this.transform.posZ -= deltaTime;
	}

	/** Returns the vertices of this actor's model */
	get vertices()
	{
		if (modelStore[this.modelName] === undefined)
		{
			throw new Error(`Attempted to get vertices of non-loaded model '${this.modelName}'.`);
		}
		return modelStore[this.modelName].vertices;
	}

	get indices()
	{
		if (modelStore[this.modelName] === undefined)
		{
			console.error(`Attempted to get indices of non-loaded model '${this.modelName}'.`);
			return [];
		}
		return modelStore[this.modelName].indices;
	}

	transformedVertices(modelMatrix = mat4.create())
	{
		if (modelStore[this.modelName] === undefined)
		{
			throw new Error(`Attempted to get vertices of non-loaded model '${this.modelName}'.`);
		}
		return modelStore[this.modelName].transformedVertices(modelMatrix);
	}
}

class Stage
{
	/**
	 * @param {string} name
	 * @param {StageActor[]} actors
	 */
	constructor(name = '', setpieces = [], actors = [])
	{
		/** @type {string} */
		this.name = name;
		/** @type {{ [n: number]: StageActor} */
		this.setpieces = setpieces;
		/** @type {{ [n: number]: StageActor, camera: StageActor } */
		this.actors = actors;
		this.actors.camera = new StageActor('camera', DEFAULT_MODEL_NAME);
	}

	update(deltaTime, elapsedTime)
	{
		this.actors.forEach(actor => actor.update(deltaTime, elapsedTime));
	}

	/** @type {number[]} */
	get vertices()
	{
		const stageVertices = [];
		this.setpieces.forEach((/** @type {StageActor} */ actor) => {
			stageVertices.push(...actor.vertices);
		});
		return stageVertices;
	}
	/** @type {number[]} */
	get indices()
	{
		const stageIndices = [];
		let lastIndex = 0;
		this.setpieces.forEach((actor) => {
			const setpieceIndices = actor.indices.map(value => value + lastIndex);
			lastIndex = actor.vertices.length / VERTEX_COMPONENTS_LENGTH;
			stageIndices.push(...setpieceIndices);
		});
		return stageIndices;
	}

	/** @type {number[][]} */
	get actorVertices()
	{
		const actorVertices = [];
		this.actors.forEach((actor) => {
			actorVertices.push(actor.vertices);
		});
		return actorVertices;
	}
	/** @type {number[][]} */
	get actorIndices()
	{
		const actorIndices = [];
		this.actors.forEach((actor) => {
			actorIndices.push(actor.indices);
		});
		return actorIndices;
	}
}

class OBJModel
{
	constructor(name = '', positions = [], texCoords = [], normals = [], indices = [])
	{
		this.name = name;
		this.positions = positions;
		this.texCoords = texCoords;
		this.normals = normals;
		this._indices = indices;
	}

	/**
	 * Returns the vertices of this model, optionally transformed by the given model matrix
	 * @param {mat4} modelMatrix
	 * @returns {number[]}
	 */
	transformedVertices(modelMatrix = mat4.create()) {
		const vertices = [];

		for (let i = 0; i < this.positions.length; ++i)
		{
			const transformedPosition = vec3.create();
			vec3.transformMat4(transformedPosition, this.positions[i], modelMatrix);
			vertices.push(
				...transformedPosition,
				...this.texCoords[i],
				...this.normals[i]
			);
		}

		return vertices;
	}

	/** Returns the vertices of this model. */
	get vertices() { return this.transformedVertices(); }

	get indices() { return this._indices; }
}
