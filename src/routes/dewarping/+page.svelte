<script lang="ts"></script>

<title>Dewarping fisheye cameras</title>
<meta name="description" content="Dewarping fisheye cameras" />

<main>
	<h1>Dewarping fisheye cameras</h1>
	<p>
		Hi friends, if you also struggling with dewarping for fisheye cameras here
		some useful info for you
	</p>

	<p>
		When using a fisheye camera, the image is distorted. This is because the
		camera lens is curved, and the image sensor is flat. This distortion can be
		corrected using a dewarping algorithm.
	</p>

	<h2>How it works</h2>

	<p>
		The dewarping algorithm uses the camera's intrinsic parameters to correct
		the distortion. These parameters are usually provided by the camera
		manufacturer. The algorithm then uses these parameters to undistort the
		image and make it appear as if it was taken with a rectilinear lens.
	</p>

	<p>Here perfect article fron NVIDIA</p>

	<iframe
		title="NVIDIA VPI Lens Distortion Correction"
		src="https://docs.nvidia.com/vpi/algo_ldc.html"
		width="100%"
		height="500px"
		frameborder="0"
		scrolling="yes"
	/>

	<h2>Dewarping in 360</h2>

	<p>
		In case if you need to display fisheye camera in 3d space, you can use video
		source as texture for sphere geometry, but first you need get rid of extra
		space around the image with html5 canvas
	</p>

	<p>You can use free tools like Blender to create half sphere geometry</p>
	<p>The you need to setup UV</p>
	<iframe
		title="Blender UV"
		width="100%"
		height="500px"
		frameborder="0"
		scrolling="yes"
		src="https://all3dp.com/2/blender-uv-mapping-simply-explained/"
	/>
</main>

<style>
	main {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: center;
		gap: 1rem;
		max-width: 1200px;
		margin: 0 auto;
	}
	h1 {
		font-size: 2rem;
	}
	h2 {
		font-size: 1.5rem;
	}
	p {
		font-size: 1rem;
	}
	iframe {
		width: 100%;
		height: 500px;
	}
</style>
